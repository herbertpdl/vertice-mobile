import { onlineManager } from "@tanstack/react-query";
import Storage from "expo-sqlite/kv-store";

import { bffError, mockBff, type BffMock } from "@/test/bff";

import {
  clearLocalSession,
  clearWorkoutData,
  closeOutbox,
  enqueue,
  openOutbox,
  pendingOperations,
  readLocalSession,
  saveLocalSession,
  whenDrained,
} from "./outbox";

let bff: BffMock;
const drained = jest.fn();
const tick = (exerciseSetId: number, weight = "40") => ({ kind: "recordSet", logId: 500, exerciseSetId, weight, reps: 10 }) as const;
const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

afterEach(() => {
  bff?.restore();
  clearWorkoutData();
  onlineManager.setOnline(true);
  jest.useRealTimers();
  drained.mockClear();
});

describe("outbox", () => {
  it("sends in order and says when it's drained", async () => {
    bff = mockBff({
      "POST /api/workout-sessions/500/sets": {},
      "DELETE /api/workout-sessions/500/sets/11": new Response(null, { status: 204 }),
      "POST /api/workout-sessions/500/complete": { id: 500, status: "COMPLETED", completionKind: "CLIENT" },
    });
    openOutbox(7, drained);
    enqueue(tick(11));
    enqueue({ kind: "deleteSet", logId: 500, exerciseSetId: 11 });
    const done = enqueue({ kind: "complete", logId: 500 });
    await expect(done).resolves.toMatchObject({ completionKind: "CLIENT" });
    expect(bff.calls.map((c) => c.route)).toEqual([
      "POST /api/workout-sessions/500/sets",
      "DELETE /api/workout-sessions/500/sets/11",
      "POST /api/workout-sessions/500/complete",
    ]);
    await flush();
    expect(drained).toHaveBeenCalled();
    expect(pendingOperations()).toEqual([]);
  });

  it("keeps what was queued offline, across a restart, and sends it when the connection returns (R56–R58)", async () => {
    bff = mockBff({ "POST /api/workout-sessions/500/sets": {} });
    onlineManager.setOnline(false);
    openOutbox(7, drained);
    enqueue(tick(11, "40"));
    enqueue(tick(12, "42.5"));
    await flush();
    expect(bff.calls).toEqual([]);

    // The app closes and opens again, still offline: the queue is read back from the device.
    closeOutbox();
    openOutbox(7, drained);
    expect(pendingOperations()).toHaveLength(2);

    onlineManager.setOnline(true);
    await whenDrained(1000);
    expect(bff.calls.map((c) => (c.body as { weight: string }).weight)).toEqual(["40", "42.5"]);
  });

  it("retries a network error or a 5xx with backoff, keeping the order", async () => {
    jest.useFakeTimers();
    let failures = 2;
    bff = mockBff({
      "POST /api/workout-sessions/500/sets": () => (failures-- > 0 ? bffError(503, "UNAVAILABLE") : Response.json({})),
      "POST /api/workout-sessions/500/complete": {},
    });
    openOutbox(7, drained);
    enqueue(tick(11));
    const done = enqueue({ kind: "complete", logId: 500 });
    await jest.advanceTimersByTimeAsync(0);
    expect(bff.calls).toHaveLength(1);
    await jest.advanceTimersByTimeAsync(1000);
    expect(bff.calls).toHaveLength(2);
    await jest.advanceTimersByTimeAsync(2000);
    await done;
    expect(bff.calls.map((c) => c.route)).toEqual([
      "POST /api/workout-sessions/500/sets",
      "POST /api/workout-sessions/500/sets",
      "POST /api/workout-sessions/500/sets",
      "POST /api/workout-sessions/500/complete",
    ]);
  });

  it("waits out a 429's Retry-After", async () => {
    jest.useFakeTimers();
    let limited = true;
    bff = mockBff({
      "POST /api/workout-sessions/500/sets": () => {
        if (!limited) return Response.json({});
        limited = false;
        return bffError(429, "RATE_LIMITED", { "Retry-After": "30" });
      },
    });
    openOutbox(7, drained);
    const done = enqueue(tick(11));
    await jest.advanceTimersByTimeAsync(29_000);
    expect(bff.calls).toHaveLength(1);
    await jest.advanceTimersByTimeAsync(1_000);
    await done;
    expect(bff.calls).toHaveLength(2);
  });

  it("drops what the API refuses for good (a set the trainer deleted) and goes on (E15)", async () => {
    bff = mockBff({
      "POST /api/workout-sessions/500/sets": bffError(400, "VALIDATION_ERROR"),
      "POST /api/workout-sessions/500/complete": {},
    });
    openOutbox(7, drained);
    const dropped = enqueue(tick(99));
    const done = enqueue({ kind: "complete", logId: 500 });
    await expect(dropped).rejects.toMatchObject({ status: 400 });
    await done;
    expect(pendingOperations()).toEqual([]);
  });

  it("re-sends a feedback whose answer timed out with the same key (no duplicate upstream)", async () => {
    jest.useFakeTimers();
    let answered = false;
    bff = mockBff({ "POST /api/workout-logs/500/feedback": {} });
    const routed = global.fetch;
    // The first answer never comes: the request is aborted at the client's timeout.
    global.fetch = ((input: RequestInfo | URL, init?: RequestInit) => {
      if (answered || !String(input).endsWith("/feedback")) return routed(input, init);
      answered = true;
      return new Promise<Response>((_, reject) => init?.signal?.addEventListener("abort", () => reject(new Error("aborted"))));
    }) as typeof fetch;
    openOutbox(7, drained);
    const feedback = enqueue({ kind: "feedback", logId: 500, rating: "EASY", text: "" });
    await jest.advanceTimersByTimeAsync(16_000);
    await feedback;
    const sent = bff.calls.filter((c) => c.route === "POST /api/workout-logs/500/feedback");
    expect(sent).toHaveLength(1);
    expect((sent[0].body as { clientKey: string }).clientKey).toMatch(/^[A-Za-z0-9_-]{1,64}$/);
  });

  it("stops on a 401 and keeps the queue for this user's next session", async () => {
    bff = mockBff({ "POST /api/workout-sessions/500/sets": bffError(401, "UNAUTHORIZED") });
    openOutbox(7, drained);
    enqueue(tick(11));
    await flush();
    await flush();
    expect(bff.calls).toHaveLength(1);
    expect(pendingOperations()).toHaveLength(1);
    closeOutbox();
    expect(Storage.getItemSync("outbox:7")).not.toBeNull();
  });

  it("removes the local session once its finish is sent", async () => {
    bff = mockBff({ "POST /api/workout-sessions/500/complete": {} });
    onlineManager.setOnline(false);
    openOutbox(7, drained);
    saveLocalSession({ workoutId: 12, logId: 500, state: {} as never, sent: {} });
    enqueue({ kind: "complete", logId: 500 });
    expect(readLocalSession()?.logId).toBe(500);
    onlineManager.setOnline(true);
    await whenDrained(1000);
    expect(readLocalSession()).toBeNull();
  });

  it("clears another account's workout data on open, and everything on clearWorkoutData", () => {
    onlineManager.setOnline(false);
    openOutbox(7, drained);
    enqueue(tick(11));
    saveLocalSession({ workoutId: 12, logId: 500, state: {} as never, sent: {} });
    closeOutbox();

    openOutbox(8, drained);
    expect(pendingOperations()).toEqual([]);
    expect(readLocalSession()).toBeNull();
    expect(Storage.getAllKeysSync().filter((k) => k.endsWith(":7"))).toEqual([]);

    saveLocalSession({ workoutId: 12, logId: 501, state: {} as never, sent: {} });
    clearLocalSession(999);
    expect(readLocalSession()?.logId).toBe(501);
    clearWorkoutData();
    expect(Storage.getAllKeysSync()).toEqual([]);
  });
});
