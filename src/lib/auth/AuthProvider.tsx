import { createContext, use, useEffect, useRef, useState, type ReactNode } from "react";

import { configureApiSession } from "@/lib/api/client";
import type { AuthSession } from "@/lib/api/types";
import { queryClient } from "@/lib/query-client";

import { clearStoredToken, readStoredToken, storeToken } from "./tokenStorage";

export type SessionStatus = "restoring" | "signedOut" | "signedIn";

type AuthApi = {
  status: SessionStatus;
  /** Keep the session from a login or register response. */
  signIn: (session: AuthSession) => Promise<void>;
  /** Forget the token and every cached response. `expired`: the BFF rejected the token (401). */
  signOut: (reason?: "user" | "expired") => Promise<void>;
  /** True once after a 401 signed the user out, so the login screen can say why. */
  sessionExpired: boolean;
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
 * `status === "restoring"`), hands it to `apiFetch` as the bearer token, and signs out on any 401
 * from an authenticated call. The token is the only thing persisted; who the user is comes from
 * `GET /api/auth/me` (`useMe`), so a role or consent change upstream is never served stale.
 *
 * Tokens last 8 h and there is no refresh token (audit P2-05 step 3, a BFF decision): when one
 * expires the next call's 401 signs out and the login screen explains it.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<SessionStatus>("restoring");
  const [sessionExpired, setSessionExpired] = useState(false);
  // Read synchronously by `apiFetch` on every request, so a ref rather than state.
  const token = useRef<string | null>(null);

  const signOut = async (reason: "user" | "expired" = "user") => {
    if (token.current === null && status === "signedOut") return;
    token.current = null;
    setSessionExpired(reason === "expired");
    setStatus("signedOut");
    queryClient.clear();
    await clearStoredToken();
  };

  const signIn = async (session: AuthSession) => {
    await storeToken(session.token);
    token.current = session.token;
    setSessionExpired(false);
    setStatus("signedIn");
  };

  useEffect(() => {
    configureApiSession({
      getToken: () => token.current,
      onUnauthorized: () => {
        if (token.current !== null) void signOut("expired");
      },
    });
  });

  useEffect(() => {
    let cancelled = false;
    void readStoredToken().then((stored) => {
      if (cancelled) return;
      token.current = stored;
      setStatus(stored === null ? "signedOut" : "signedIn");
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <AuthContext value={{ status, signIn, signOut, sessionExpired }}>{children}</AuthContext>
  );
}
