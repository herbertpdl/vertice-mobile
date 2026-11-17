import { focusManager, onlineManager } from "@tanstack/react-query";
import { createContext, use, useEffect, useRef, useState, type ReactNode } from "react";

import { renewSession } from "@/lib/api/auth";
import { ApiError, configureApiSession } from "@/lib/api/client";
import { clearDrafts } from "@/lib/draftStash";
import { clearExports } from "@/lib/exportData";
import type { AuthSession } from "@/lib/api/types";
import { queryClient } from "@/lib/query-client";
import { clearWorkoutData } from "@/lib/workoutSession/outbox";

import { isRenewalDue, retryNotBefore } from "./renewal";
import { clearStoredSession, readStoredSession, storeSession, type RenewalRecord } from "./tokenStorage";

export type SessionStatus = "restoring" | "signedOut" | "signedIn";

/**
 * Why a session ended. `user`: "Sair" (or deleting the account) — drafts and the workout outbox
 * go with it. `expired`: the BFF rejected the token (401: 90 days unused, the password changed
 * elsewhere, the account deleted). `passwordChanged`: the password was changed on this phone,
 * which ends every session including this one (PRD R10). The last two keep drafts and the outbox
 * for the next login (R16).
 */
export type SignOutReason = "user" | "expired" | "passwordChanged";

/** What the login screen says about the session that just ended, if it didn't end with "Sair". */
export type SessionEnded = Exclude<SignOutReason, "user"> | null;

type AuthApi = {
  status: SessionStatus;
  /** Keep the session from a login or register response. */
  signIn: (session: AuthSession) => Promise<void>;
  /** Forget the token and every cached response (see `SignOutReason`). */
  signOut: (reason?: SignOutReason) => Promise<void>;
  /** Set once a session ended without "Sair", so the login screen can say why. */
  sessionEnded: SessionEnded;
};

const AuthContext = createContext<AuthApi | null>(null);

/** The session, from any component under `AuthProvider`. */
export function useAuth(): AuthApi {
  const api = use(AuthContext);
  if (api === null) throw new Error("useAuth must be used inside <AuthProvider>");
  return api;
}

/**
 * Owns the session: restores the stored token at launch (the splash stays up meanwhile —
 * `status === "restoring"`), hands it to `apiFetch` as the bearer token, and signs out when the
 * BFF rejects *the current* token (a late 401 from a request sent under an earlier session is
 * ignored). The token is the only credential persisted; who the user is comes from
 * `GET /api/auth/me` (`useMe`), so a role or consent change upstream is never served stale.
 *
 * Sessions persist (mobile-persistent-session spec): every request says it's the mobile app
 * (`X-Vertice-Client: mobile`), so login and register issue a token that lasts 90 days, and this
 * provider renews it — on launch, on return to the foreground and on reconnecting, at most once a
 * day, only online, one renewal at a time — so the 90 days count from the last use (R3, R4). A
 * token that can't be renewed (an 8 h one from an older build, R18) is left to expire as before.
 * When a session ends server-side the next call's 401 signs out and the login screen explains it.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<SessionStatus>("restoring");
  const [sessionEnded, setSessionEnded] = useState<SessionEnded>(null);
  // Read synchronously by `apiFetch` on every request, so refs rather than state.
  const token = useRef<string | null>(null);
  const signingOut = useRef(false);
  // Renewal: the current token's record (its expiry and when this device got it; null: not
  // renewable), the renewal in flight (single-flight), and the earliest next attempt after a failure.
  const renewal = useRef<RenewalRecord | null>(null);
  const renewing = useRef<Promise<void> | null>(null);
  const nextAttemptAt = useRef(0);

  const signOut = async (reason: SignOutReason = "user") => {
    // Many requests can 401 at once: the first sign-out wins, the rest are no-ops.
    if (signingOut.current || token.current === null) return;
    signingOut.current = true;
    token.current = null;
    renewal.current = null;
    setSessionEnded(reason === "user" ? null : reason);
    // A session that ended by itself keeps the unsaved drafts for the re-login; "Sair" means done.
    // An exported data file never outlives the session that made it.
    if (reason === "user") clearDrafts();
    // The same for the workout outbox and the session in progress (client spec §3.4): kept on the
    // device for a re-login after a 401 or a password change, gone on "Sair" and account deletion.
    if (reason === "user") clearWorkoutData();
    clearExports();
    setStatus("signedOut");
    try {
      // Stop in-flight requests before dropping the cache, so the previous user's data can't land
      // in a query a still-mounted screen observes.
      await queryClient.cancelQueries();
      queryClient.clear();
      // Again once the signed-in screens have unmounted: one with unsaved changes stashes them then.
      if (reason === "user") clearDrafts();
      await clearStoredSession();
    } finally {
      signingOut.current = false;
    }
  };

  const signIn = async (session: AuthSession) => {
    // The login is the session's first use: the next renewal is due a day from now.
    const record = { expiresAt: session.expiresAt, renewedAt: Date.now() };
    await storeSession({ token: session.token, renewal: record });
    token.current = session.token;
    renewal.current = record;
    nextAttemptAt.current = 0;
    setSessionEnded(null);
    setStatus("signedIn");
  };

  /** Renews the token if it's due, online, and no renewal is already running. Never throws. */
  const renewIfDue = () => {
    const current = token.current;
    const last = renewal.current;
    const now = Date.now();
    // No record: an 8 h token from an older build (R18) or one the BFF refused to renew. Never sent.
    if (current === null || last === null || signingOut.current || renewing.current !== null) return;
    if (!isRenewalDue(last.renewedAt, now) || now < nextAttemptAt.current || !onlineManager.isOnline()) return;
    renewing.current = (async () => {
      try {
        const session = await renewSession();
        // Signed out, or signed in as someone else, while the request was out: not ours to keep.
        if (token.current !== current) return;
        const record = { expiresAt: session.expiresAt, renewedAt: Date.now() };
        token.current = session.token;
        renewal.current = record;
        // Storage writes are serialized, so a sign-out after this point still deletes it. If the
        // write fails, the old token (still valid) stays stored and is renewed on the next launch.
        await storeSession({ token: session.token, renewal: record }).catch(() => {});
      } catch (error) {
        // 401 (`UNAUTHORIZED` or `UNAUTHENTICATED`): `apiFetch` has already signed out as expired.
        // A 403 — `SESSION_NOT_RENEWABLE` for an 8 h token, `FORBIDDEN` for a role renewal isn't
        // for (ADMIN) — or a BFF that predates renewal (404): the session goes on and runs out by
        // itself, but is never sent to renewal again.
        if (token.current !== current) return;
        if (error instanceof ApiError && (error.status === 403 || error.status === 404)) {
          renewal.current = null;
          await storeSession({ token: current, renewal: null }).catch(() => {});
          return;
        }
        nextAttemptAt.current = retryNotBefore(error, Date.now());
      } finally {
        renewing.current = null;
      }
    })();
  };

  // The API session and the renewal triggers are registered once; they reach the latest
  // `signOut` / `renewIfDue` through refs.
  const signOutRef = useRef(signOut);
  const renewRef = useRef(renewIfDue);
  useEffect(() => {
    signOutRef.current = signOut;
    renewRef.current = renewIfDue;
  });
  useEffect(
    () =>
      configureApiSession({
        getToken: () => token.current,
        onUnauthorized: (rejectedToken) => {
          if (rejectedToken === token.current) void signOutRef.current("expired");
        },
      }),
    [],
  );
  // Foreground (`focusManager` ← AppState in query-client.ts) and reconnect (`onlineManager` ←
  // NetInfo): the moments the app is being used. Both only renew when due.
  useEffect(() => {
    const offFocus = focusManager.subscribe((focused) => {
      if (focused) renewRef.current();
    });
    const offOnline = onlineManager.subscribe((online) => {
      if (online) renewRef.current();
    });
    return () => {
      offFocus();
      offOnline();
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    void readStoredSession().then((stored) => {
      if (cancelled) return;
      token.current = stored?.token ?? null;
      renewal.current = stored?.renewal ?? null;
      setStatus(stored === null ? "signedOut" : "signedIn");
      // Launch counts as a use.
      renewRef.current();
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <AuthContext value={{ status, signIn, signOut, sessionEnded }}>{children}</AuthContext>
  );
}
