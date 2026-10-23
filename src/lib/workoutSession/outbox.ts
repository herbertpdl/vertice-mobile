import { onlineManager } from "@tanstack/react-query";

import { ApiError } from "@/lib/api/client";
import { submitFeedback } from "@/lib/api/feedback";
import type { FeedbackRating } from "@/lib/api/types";
import { completeWorkoutLog, deleteSetLog, discardWorkoutLog, recordSetLog } from "@/lib/api/workoutSessions";
import { reportDroppedOperation } from "@/lib/monitoring";

import type { SessionState } from "./engine";
import { store } from "./store";

/**
 * The workout's offline outbox (client spec §3.4, PRD R55–R58). Every write of a session — ticks,
 * unticks, weights, finishing, discarding, feedback — goes in an ordered queue kept on the device
 * (`expo-sqlite/kv-store`, never the token), and one sender sends it in order: on enqueue, when the
 * connection returns and when the client app opens. The session itself (`SessionState`) is kept
 * beside it, so a closed app or a re-login resumes where the client was.
 *
 * - No answer or a 5xx: retried with backoff. A 429: retried after `Retry-After`.
 * - A 401: the sender stops (the session ends, as everywhere) and the queue stays for this user.
 * - Any other 4xx: the operation is dropped (a set the trainer deleted mid-session, a session the
 *   weekly rollover closed), reported without its data.
 *
 * Keys carry the user id. "Sair", account deletion and another account signing in clear them; a
 * 401 keeps them, like the drafts.
 */

export type OutboxOp =
  | { kind: "recordSet"; logId: number; exerciseSetId: number; weight: string; reps: number }
  | { kind: "deleteSet"; logId: number; exerciseSetId: number }
  // `workoutId`: opening that workout again waits for these to be sent.
  | { kind: "complete"; logId: number; workoutId?: number }
  | { kind: "discard"; logId: number; workoutId?: number }
  | { kind: "feedback"; logId: number; rating: FeedbackRating; text: string };

type Entry = { id: string; op: OutboxOp };

/** The session as last seen on this device, for one workout. */
export type LocalSession = {
  workoutId: number;
  logId: number;
  state: SessionState;
  /** What was last recorded per set (the weights a later edit compares against). */
  sent: Record<number, string>;
};

const MAX_BACKOFF_MS = 60_000;
const outboxKey = (userId: number) => `outbox:${userId}`;
const sessionKey = (userId: number) => `session:${userId}`;
const isWorkoutKey = (key: string) => key.startsWith("outbox:") || key.startsWith("session:");

let userId: number | null = null;
let queue: Entry[] = [];
let sending = false;
let failures = 0;
let retryTimer: ReturnType<typeof setTimeout> | null = null;
let unsubscribeOnline: (() => void) | null = null;
let onDrained: (() => void) | null = null;
let nextId = 0;
/** Bumped on every open and close: a send still running from before stops when it returns. */
let generation = 0;
/** This app run's waiters per entry: the response when sent, the error when dropped. */
const waiters = new Map<string, { resolve: (value: unknown) => void; reject: (error: unknown) => void }>();
const drainWaiters = new Set<() => void>();

function readJson<T>(key: string): T | null {
  try {
    const raw = store.get(key);
    return raw === null ? null : (JSON.parse(raw) as T);
  } catch {
    return null;
  }
}

function persist() {
  if (userId === null) return;
  if (queue.length === 0) store.remove(outboxKey(userId));
  else store.set(outboxKey(userId), JSON.stringify(queue));
}

function send(op: OutboxOp): Promise<unknown> {
  switch (op.kind) {
    case "recordSet":
      return recordSetLog(op.logId, { exerciseSetId: op.exerciseSetId, weight: op.weight, reps: op.reps });
    case "deleteSet":
      return deleteSetLog(op.logId, op.exerciseSetId);
    case "complete":
      return completeWorkoutLog(op.logId);
    case "discard":
      return discardWorkoutLog(op.logId);
    case "feedback":
      return submitFeedback(op.logId, { rating: op.rating, text: op.text });
  }
}

function settle(entry: Entry, outcome: { value: unknown } | { error: unknown }) {
  queue = queue.filter((e) => e.id !== entry.id);
  persist();
  const waiter = waiters.get(entry.id);
  waiters.delete(entry.id);
  if ("value" in outcome) {
    // A finished or discarded session no longer needs its local copy.
    if (entry.op.kind === "complete" || entry.op.kind === "discard") clearLocalSession(entry.op.logId);
    waiter?.resolve(outcome.value);
  } else waiter?.reject(outcome.error);
}

function retryIn(ms: number) {
  if (retryTimer !== null) clearTimeout(retryTimer);
  retryTimer = setTimeout(() => {
    retryTimer = null;
    void pump();
  }, ms);
}

async function pump(): Promise<void> {
  if (sending || userId === null || retryTimer !== null) return;
  sending = true;
  const owner = generation;
  try {
    while (queue.length > 0 && onlineManager.isOnline() && generation === owner) {
      const entry = queue[0];
      try {
        const value = await send(entry.op);
        if (generation !== owner) return;
        failures = 0;
        settle(entry, { value });
      } catch (error) {
        if (generation !== owner) return;
        const status = error instanceof ApiError ? error.status : 0;
        if (status === 401) return; // Signed out: the queue waits for this user's next session.
        if (entry.op.kind === "feedback" && error instanceof ApiError && error.code === "TIMEOUT") {
          // The request may have reached the server, and each feedback sent is a new one: a retry
          // could give the trainer the same feedback twice. Taken as sent.
          failures = 0;
          settle(entry, { value: null });
          continue;
        }
        if (status === 429) return retryIn(((error as ApiError).retryAfter ?? 5) * 1000);
        if (status === 0 || status >= 500) {
          failures += 1;
          return retryIn(Math.min(MAX_BACKOFF_MS, 1000 * 2 ** (failures - 1)));
        }
        reportDroppedOperation(entry.op.kind, error instanceof ApiError ? error.code : "UNKNOWN");
        settle(entry, { error });
      }
    }
    if (queue.length === 0 && generation === owner) {
      onDrained?.();
      for (const resolve of drainWaiters) resolve();
      drainWaiters.clear();
    }
  } finally {
    if (generation === owner) sending = false;
  }
}

/**
 * Opens this user's outbox and starts sending it (the client app's layout). Another account's
 * leftovers are cleared: the device keeps one client's workout data at a time.
 */
export function openOutbox(id: number, drained: () => void) {
  if (userId !== id) {
    closeOutbox();
    for (const key of store.keys()) {
      if (isWorkoutKey(key) && key !== outboxKey(id) && key !== sessionKey(id)) store.remove(key);
    }
    generation += 1;
    userId = id;
    queue = readJson<Entry[]>(outboxKey(id)) ?? [];
    unsubscribeOnline = onlineManager.subscribe((online) => {
      if (online) {
        failures = 0;
        if (retryTimer !== null) clearTimeout(retryTimer);
        retryTimer = null;
        void pump();
      }
    });
  }
  onDrained = drained;
  void pump();
}

/** Stops sending (any sign-out). What's queued stays on the device. */
export function closeOutbox() {
  if (retryTimer !== null) clearTimeout(retryTimer);
  retryTimer = null;
  unsubscribeOnline?.();
  unsubscribeOnline = null;
  for (const waiter of waiters.values()) waiter.reject(new ApiError({ code: "NETWORK_ERROR", message: "outbox closed" }, 0));
  waiters.clear();
  drainWaiters.clear();
  generation += 1;
  sending = false;
  userId = null;
  queue = [];
  failures = 0;
  onDrained = null;
}

/** "Sair" and account deletion: every workout key on the device goes, then sending stops. */
export function clearWorkoutData() {
  closeOutbox();
  for (const key of store.keys()) if (isWorkoutKey(key)) store.remove(key);
}

/**
 * Queues a write and starts sending. The promise is for this app run only: it resolves with the
 * response once sent and rejects when the API refused it for good. Nobody has to wait on it: the
 * write is sent either way.
 */
export function enqueue(op: OutboxOp): Promise<unknown> {
  const entry: Entry = { id: `${Date.now()}-${nextId++}`, op };
  const result = new Promise<unknown>((resolve, reject) => waiters.set(entry.id, { resolve, reject }));
  // Callers may ignore it: an unobserved drop must not surface as an unhandled rejection.
  result.catch(() => {});
  if (userId === null) {
    waiters.get(entry.id)?.reject(new ApiError({ code: "NETWORK_ERROR", message: "outbox closed" }, 0));
    waiters.delete(entry.id);
    return result;
  }
  queue = [...queue, entry];
  persist();
  void pump();
  return result;
}

/**
 * Queues a write the screen would like the answer to: online, waits for it up to `timeoutMs`;
 * offline (or past the wait), resolves `null` — it's sent later. Rejects only when the API refused
 * it for good.
 */
export function sendNow<T>(op: OutboxOp, timeoutMs: number): Promise<T | null> {
  const answer = enqueue(op) as Promise<T>;
  if (!onlineManager.isOnline()) return Promise.resolve(null);
  let timer: ReturnType<typeof setTimeout> | undefined;
  const late = new Promise<null>((resolve) => (timer = setTimeout(() => resolve(null), timeoutMs)));
  return Promise.race([answer, late]).finally(() => clearTimeout(timer));
}

/** Resolves once everything queued so far is sent (or `timeoutMs` passes; false then). */
export function whenDrained(timeoutMs: number): Promise<boolean> {
  if (queue.length === 0) return Promise.resolve(true);
  return new Promise((resolve) => {
    const done = () => {
      clearTimeout(timer);
      resolve(true);
    };
    const timer = setTimeout(() => {
      drainWaiters.delete(done);
      resolve(false);
    }, timeoutMs);
    drainWaiters.add(done);
  });
}

/** Operations not sent yet (tests and the session screen's offline check). */
export function pendingOperations(): readonly OutboxOp[] {
  return queue.map((entry) => entry.op);
}

// ---- the local session --------------------------------------------------------------------------

export function readLocalSession(): LocalSession | null {
  return userId === null ? null : readJson<LocalSession>(sessionKey(userId));
}

export function saveLocalSession(session: LocalSession) {
  if (userId !== null) store.set(sessionKey(userId), JSON.stringify(session));
}

/** Forgets the local session (only when it's `logId`'s, when given). */
export function clearLocalSession(logId?: number) {
  if (userId === null) return;
  if (logId !== undefined && readLocalSession()?.logId !== logId) return;
  store.remove(sessionKey(userId));
}
