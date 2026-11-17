# Spec: Stay logged in on the mobile app (vertice-mobile)

PRD: [vertice-api `docs/prds/mobile-persistent-session/prd.md`](https://github.com/herbertpdl/vertice-api/blob/main/docs/prds/mobile-persistent-session/prd.md) (Approved).
Assessment: [`docs/assessments/mobile-persistent-session/assessment.md`](../../assessments/mobile-persistent-session/assessment.md)
(M1–M5). Ticket: VRT-7. Depends on vertice-bff VRT-6 (`feat/mobile-persistent-session`), which
depends on vertice-api voiding tokens older than a password or role change.

No new screen and no design change: two existing banners get new copy and one screen's hint text
changes. One branch, one PR (`feat/mobile-persistent-session`), no native rebuild (JS only;
`expo-secure-store` is already linked).

## 1. Contract (M2)

From vertice-bff `docs/openapi.json` at the commit in `src/lib/api/.bff-ref` (`npm run api:types`):

- `X-Vertice-Client: mobile` request header, declared on `POST /api/auth/login`,
  `/api/auth/register` and `/api/auth/session/renew`. With it a TRAINER or CLIENT gets a 90-day
  token; without it (or for ADMIN) the web's 8 h one.
- `AuthSession` gains `expiresAt` (ISO-8601, the token's `exp`).
- `POST /api/auth/session/renew` (authenticated, no body) → 200 `AuthSession` with a fresh 90-day
  token. 401 when vertice-api no longer accepts the token (password or role changed, account
  deleted; `UNAUTHORIZED` for an invalid or expired token); 403 `SESSION_NOT_RENEWABLE` for an 8 h token, `FORBIDDEN` for ADMIN (always 8 h); 429 `RATE_LIMITED` with `Retry-After` (5 refusals per 15 min). No body, so no `Content-Type`.

**The header is sent on every request**, from `apiFetch` (`CLIENT_HEADERS` in
`src/lib/api/client.ts`), after the caller's own headers so no call can override it. That is "set
once in the API client, never per screen": no login/register/renewal call site passes it, and a
new session-issuing route can't forget it. The BFF ignores it everywhere else; its CORS
(`@fastify/cors` with no `allowedHeaders`) reflects requested headers, so the web dev target
keeps working.

## 2. Renewal (M1; R3, R4, R18, E4, E5)

**What's stored** (`src/lib/auth/tokenStorage.ts`, SecureStore, `WHEN_UNLOCKED_THIS_DEVICE_ONLY`
as before): the token (`vertice.session.token`, unchanged key) and a renewal record
(`vertice.session.renewal`, JSON `{ expiresAt, renewedAt }`): the BFF's expiry and when this
device got the token, by its own clock. Writes are serialized in call order, so a renewal's
write can never land after a sign-out's delete.

**Which sessions renew**: only those with a record. A login or register on this build writes one.
A token restored without one came from an older build (an 8 h token): it is never sent to
renewal, and ends as today (R18). A record that doesn't parse counts as none.

**When**: `isRenewalDue(renewedAt, now)` — at least 24 h since `renewedAt`, or `renewedAt` in the
future (the clock was set back; one renewal re-bases it). Checked on:

- launch, right after the stored session is restored;
- every return to the foreground (`focusManager`, fed by `AppState` in `query-client.ts`);
- every reconnect (`onlineManager`, fed by NetInfo), so a phone opened offline renews when the
  connection comes back (E4).

The login itself counts as the first use, so its renewal is due a day later.

**Guards**, all in `AuthProvider.renewIfDue`:

- online only (`onlineManager.isOnline()`); offline, nothing is sent (E4);
- single-flight: one renewal in a ref; every trigger while it's out is dropped;
- not while signing out, not without a token;
- the answer is kept only if the token is still the one that was renewed (a sign-out or another
  login meanwhile drops it).

**Outcomes**:

| Answer | Effect |
|---|---|
| 200 | New token in memory at once, then stored with a new record. A failed store keeps the old (still valid) token on disk; the next launch renews again. |
| 401 | `apiFetch`'s existing path: `signOut("expired")` — drafts and the workout outbox kept (R16), login banner "Sua sessão terminou. Entre novamente." (R15). This is the 90-days-unused case (E4) and a password/role change elsewhere. |
| 403 (`SESSION_NOT_RENEWABLE` for an 8 h token, `FORBIDDEN` for ADMIN), 404 `NOT_FOUND` (a BFF without the route) — only with the BFF's error body | The session goes on; its record is dropped so it's never sent to renewal again; it runs out by itself. |
| 403/404 without the BFF's body (CloudFront, WAF, ALB: `UNKNOWN_ERROR`) | Not an answer about the token: next attempt after an hour, record kept. |
| 429 | Next attempt after `Retry-After`. |
| other 4xx/5xx | Next attempt after an hour. |
| no answer (`NETWORK_ERROR`, `TIMEOUT`) | Nothing changes; the next trigger retries. |

Pure helpers (`isRenewalDue`, `retryNotBefore`) are in `src/lib/auth/renewal.ts`.

## 3. Password change on this phone (M3; R10, R16)

`ChangePasswordScreen`: on 204 it calls `signOut("passwordChanged")` at once — no navigation, no
toast; `Stack.Protected` unmounts the app and the login screen shows "Senha alterada. Entre com a
nova senha." (the web's copy). Drafts and the workout outbox are kept, as for `expired`. A wrong
current password stays a field error; any other failure keeps the form filled with the banner.
The hint under the title, which promised the opposite, becomes "Ao salvar, você sai do app em
todos os aparelhos e entra de novo com a nova senha."

`AuthApi` changes: `signOut(reason?: "user" | "expired" | "passwordChanged")`, and the
`sessionExpired` boolean becomes `sessionEnded: "expired" | "passwordChanged" | null`.

## 4. Login screen copy (M4; R15)

`SESSION_ENDED_MESSAGES` in `LoginScreen.tsx`:

- `expired`: "Sua sessão terminou. Entre novamente." (was "expirou": the same banner now covers 90
  days unused, a password or role change elsewhere and a deleted account);
- `passwordChanged`: "Senha alterada. Entre com a nova senha.".

Both info-tone `Banner`s, as before. `errorMessages.ts`'s `UNAUTHORIZED` copy is unchanged (web
parity; no screen shows it for a session end).

## 5. Unchanged

"Sair" and account deletion: `signOut("user")` clears drafts, the outbox and exports (R8, R17).
The late-401 guard (a 401 for a token that's no longer current is ignored) also covers in-flight
requests carrying the pre-renewal token. "Sair" doesn't revoke the token server-side (bff B4,
accepted by the PRD).

## 6. Tests

- `tokenStorage.test.ts`: record round-trip device-only; a legacy token or garbage record reads as
  not renewable; serialized writes (a delete after a store wins); retrying deletes.
- `renewal.test.ts`: due rules (24 h, clock set back); backoff per failure.
- `AuthProvider.test.tsx`: login stores the record; renewal on launch when over a day old, with the
  header and the old bearer, then the new token is used and no second renewal that day; none when
  fresher; none for a legacy token; none offline, then on reconnect; concurrent triggers renew
  once; 401 signs out `expired` keeping drafts and the outbox; 403 keeps the session and stops
  asking; network failure retries on the next foreground; 429 waits; an answer after a sign-out
  is dropped; "Sair" clears drafts; `passwordChanged` keeps them.
- `client.test.ts`: the header on public and authenticated calls, not overridable.
- `ChangePasswordScreen.test.tsx`: success calls `signOut("passwordChanged")` once; failures don't
  sign out and keep the input; the new hint text. `LoginScreen.test.tsx`: both banners.

Jest can't show the real AppState/NetInfo wiring: check on a simulator (§8).

## 7. Rollout (M5)

Merge after vertice-bff VRT-6, with `.bff-ref` on its merge commit. Ship the store build after
the BFF is live. An older BFF ignores the header (8 h tokens) and 404s renewal, which drops the
record: mis-ordering degrades to today's behaviour. Installed older builds keep 8 h sessions
until updated (R18).

## 8. Checklist

- [x] Contract synced from the BFF PR #60 head (`f9b9691`); [ ] re-pinned to the BFF merge commit on main.
- [x] Header from the API client.
- [x] Renewal: record, triggers, guards, outcomes.
- [x] Password change sign-out and copy.
- [x] Login banner copy.
- [x] `AuthProvider.tsx` notes and `CLAUDE.md` updated.
- [ ] Simulator check against a local BFF: login stores the record; backgrounding and returning
  after moving `renewedAt` back renews once; airplane mode sends nothing; changing the password
  lands on the login banner.

## 9. Decisions

| Question | Decision | Why |
|---|---|---|
| Header on which requests? | Every request, from `apiFetch`. | One place, can't be forgotten; harmless elsewhere; CORS reflects it. |
| What marks a renewable session? | The stored record (BFF `expiresAt` + device time), written only by this build's login/register/renewal. | Never renews a legacy 8 h token (R18, assessment M1). |
| "Due" by device time since renewal, or by server expiry? | Device time since the last renewal. | Server expiry vs a wrong device clock could renew on every foreground. |
| Triggers | Launch, foreground, reconnect. | The moments of use; reconnect covers E4. |
| 403 `SESSION_NOT_RENEWABLE`/`FORBIDDEN`, 404 `NOT_FOUND` on renewal | Keep the session, drop the record, never retry. Same statuses without the BFF's code back off an hour. | Only a 401 means the session is over; a proxy's page must not end renewal for good. |
| Password-change copy | "Senha alterada. Entre com a nova senha." | Same as the web; assessment M3. |
| Session-ended copy | "Sua sessão terminou. Entre novamente." | Covers every server-side end (M4). |
