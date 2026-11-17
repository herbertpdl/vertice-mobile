import { ApiError } from "@/lib/api/client";

/**
 * How often a mobile session is renewed while the app is used (spec §2): at most once a day. The
 * token lasts 90 days since its last renewal (PRD R3, R4), so a daily renewal keeps anyone who
 * opens the app at least once every few weeks signed in for good (E5), at one request a day.
 */
export const RENEWAL_INTERVAL_MS = 24 * 60 * 60 * 1000;

/** After a renewal the BFF answered with an error other than 401 (and no `Retry-After`). */
export const RENEWAL_FAILURE_BACKOFF_MS = 60 * 60 * 1000;

/**
 * Whether a session last renewed at `renewedAt` is due again at `now` (both epoch ms). A device
 * clock set back before the last renewal counts as due: one renewal re-bases it, instead of
 * waiting out however far the clock moved.
 */
export function isRenewalDue(renewedAt: number, now: number): boolean {
  return now < renewedAt || now - renewedAt >= RENEWAL_INTERVAL_MS;
}

/**
 * When to try again after a failed renewal, or 0 for "on the next trigger". No answer
 * (`NETWORK_ERROR`, `TIMEOUT`) costs the server nothing, so the next foreground or reconnect
 * retries. A 429 waits its `Retry-After`; any other answer waits an hour so a BFF refusing
 * renewals isn't asked on every foreground. A 401 never gets here as a retry: `apiFetch` already
 * signed out (`expired`).
 */
export function retryNotBefore(error: unknown, now: number): number {
  if (!(error instanceof ApiError) || error.status === 0) return 0;
  if (error.retryAfter !== undefined) return now + error.retryAfter * 1000;
  return now + RENEWAL_FAILURE_BACKOFF_MS;
}
