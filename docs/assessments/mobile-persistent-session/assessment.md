# Technical assessment: Stay logged in on the mobile app (vertice-mobile)

Status: Draft
Owner: hebertpdl@gmail.com
Related: [vertice-api `docs/prds/mobile-persistent-session/prd.md`](https://github.com/herbertpdl/vertice-api/blob/main/docs/prds/mobile-persistent-session/prd.md) (Approved),
[vertice-api assessment](https://github.com/herbertpdl/vertice-api/blob/main/docs/assessments/mobile-persistent-session/assessment.md),
[vertice-bff assessment](https://github.com/herbertpdl/vertice-bff/blob/main/docs/assessments/mobile-persistent-session/assessment.md),
`docs/specs/client-workout-experience/spec.md` (§3.4, the outbox kept across an expired session)
Spec: not yet written (will be `docs/specs/mobile-persistent-session/spec.md`)

## 1. Summary

Overall risk: Low–Medium. The app already does most of what the PRD asks when a session ends:
a 401 signs out with reason `expired`, which keeps drafts and the workout outbox and shows "Sua
sessão expirou. Entre novamente." on the login screen, while "Sair" clears them
(`src/lib/auth/AuthProvider.tsx:50-70`, `src/screens/auth/LoginScreen.tsx:89-90`). What's new is
asking for a mobile session at login/register, renewing the token while the app is used (R4), and
removing the "8 h, no refresh" assumption documented in `AuthProvider.tsx:40-41` and `CLAUDE.md`.
One UX gap: changing the password in the app now ends this phone's session too (R10), and today
the screen just goes back and the next call shows "session expired" (M3).

| Id | Severity | One line |
|---|---|---|
| M1 | High | Renewal: when and how the app trades its token for a fresh 90-day one, including offline (R4, E4), without renewing legacy 8h tokens (R18). |
| M2 | Medium | New contract fields: the mobile-client header, the session expiry and the renewal route. |
| M3 | Medium | Changing the password logs this phone out; the screen promises the opposite and `signOut("expired")` would say "expirou". |
| M4 | Low | One "expirou" banner for every server-side end of a session. |
| M5 | Info | Ships last; a mis-order degrades to today's 8h sessions. |

## 2. PRD coverage map

| Rule | Lands on | Notes |
|---|---|---|
| R1, R2 | `src/lib/api/auth.ts:13-23` (login, register) | Send the `X-Vertice-Client: mobile` header (bff B1). |
| R3, R4 | new: renewal in `src/lib/auth/` | M1. |
| R5 | n/a | Web only. |
| R6, R7 | existing | One token per install, SecureStore `WHEN_UNLOCKED_THIS_DEVICE_ONLY` (`tokenStorage.test.ts:9-10`). |
| R8, R17 | existing: `AuthProvider.tsx:50-70` (`signOut("user")` clears drafts, workout data, exports) | |
| R9, R11, R12, R14 | existing 401 path | The server voids the token (a role change too, vertice-api F1); the next call's 401 signs out. |
| R10 | `src/screens/profile/ChangePasswordScreen.tsx:45-47` | M3. |
| R13 | existing | Removing a client never 401s. |
| R15 | existing: `LoginScreen.tsx:89-90` | Copy says "expirou"; M4. |
| R16 | existing: `AuthProvider.tsx` (`reason === "expired"` keeps drafts and the outbox) | |
| R18, R19 | M1 | An 8h token from an older build ends as today, provided the new build never renews it (M1); the first login on the new build gets a mobile session. |
| E1–E3, E5–E9 | as above | |
| E4 | M1 | Renewal needs a connection; past 90 days the next online call 401s and R16 applies. |

## 3. Current state

`AuthProvider` restores the token from SecureStore at launch, hands it to `apiFetch`, and signs
out on a 401 for the current token. `signOut("expired")` keeps drafts and the workout outbox for
the re-login (client spec §3.4), `signOut("user")` clears them. The comment at
`AuthProvider.tsx:40-41` and `CLAUDE.md` ("Tokens last 8 h with no refresh token") describe the
design this feature replaces. `src/lib/query-client.ts` already listens to `AppState`, the natural
hook for "the app came to the foreground".

## 4. Findings by dimension

### PRD fit

**M3 — Medium — changing the password logs this phone out right after success.**
- What: R10 ends the session on the phone that changed the password; `ChangePasswordScreen`
  navigates back on success and the next request 401s into "Sua sessão expirou". The screen also
  tells the person the opposite: "Após salvar, você continua conectado neste aparelho." (`:77`),
  and the screen docstring (`:21-25`) and `changePassword` (`src/lib/api/auth.ts:65-67`) say the
  session stays valid.
- Where: `src/screens/profile/ChangePasswordScreen.tsx:21-25,45-47,77`, `src/lib/api/auth.ts:65-67`,
  `AuthProvider.tsx:55` (`setSessionExpired(reason === "expired")`), `LoginScreen.tsx:89-90`.
- Why it matters: the person just changed their password and is told the session "expired",
  which reads like an error, right after being promised they stay logged in.
- Recommendation: replace the line at `:77` (for example "Após salvar, você precisará entrar
  novamente com a nova senha.") and fix both comments. On success, sign out right away with a
  third reason, for example `"passwordChanged"`: it keeps drafts and the outbox like `expired`
  (R16) but sets its own state, so `LoginScreen` shows a dedicated message ("Senha alterada. Entre
  com a nova senha."). `signOut("expired")` can't do this, since its flag is what shows
  "expirou". This widens `AuthApi.signOut` (today `"user" | "expired"`) and replaces the
  `sessionExpired` boolean with a reason value. The copy is a product decision to confirm with
  the owner in the spec.

**M4 — Low — "expirou" for every server-side end.**
- What: the same banner covers 90 days unused, a password change elsewhere, a role change and a
  deleted account.
- Where: `LoginScreen.tsx:89-90`.
- Recommendation: keep one message (R15 asks only that it says the session ended); consider
  "Sua sessão terminou. Entre novamente." since it no longer only expires.

### Data model and migrations

Nothing found. Checked: only the token is persisted; storing its expiry next to it (M1) is local.

### API contract and backward compatibility

**M2 — Medium — new contract fields.**
- What: login/register read a mobile-client header and the session gains an expiry; a renewal route
  is new (bff B1, B2).
- Where: `src/lib/api/schema.ts` (generated), `src/lib/api/auth.ts`.
- Recommendation: take the BFF change through `.bff-ref` → `npm run api:types` as usual; send the
  header from login, register and renewal, in one place (the API client), never per screen.

### Security and privacy

Nothing found. Checked: the token stays in SecureStore, device-only, unlocked-only; nothing
logs it. A longer-lived token makes that storage choice more important; keep it.

### Concurrency and data integrity

**M1 — High — renewal.**
- What: R4 needs the app to renew its token while used; nothing renews today.
- Where: new, `src/lib/auth/` (with `AuthProvider` and `apiFetch`).
- Why it matters: without renewal an active person is logged out 90 days after login (breaks R4,
  E5); with careless renewal, parallel requests can race (two renewals, one stale token written
  last).
- Recommendation: renew at most once a day, on launch and when the app returns to the
  foreground, only when online; one renewal in flight at a time; write the new token only if the
  stored one is still the one that was renewed. A failed renewal for a network reason changes
  nothing; a 401 goes through the existing `signOut("expired")`.
- Legacy tokens (R18): only the token is stored today, so the app can't tell its age or kind.
  Store the expiry the BFF returns (bff B1) next to the token in SecureStore, and renew only
  tokens that have one. A token restored with no stored expiry came from an older build: never
  renew it and let it run out as today. Otherwise the first launch after updating would send an
  8h token to renewal, which bff B2 refuses, and a 401 there would sign every upgraded user out.
  Ask vertice-bff (B2) to answer "not a mobile token" with a non-401 status (for example 403
  `NOT_RENEWABLE`), which the app treats as "do nothing".

### Error handling

Nothing found. Checked: the 401 path and the late-401 guard ("a late 401 from a request sent
under an earlier session is ignored") already cover tokens voided server-side.

### Performance

Nothing found. Checked: one renewal call per day at most.

### Logging and observability

Nothing found.

### Testing

Section 6.

### Rollout

**M5 — Info — order.** Ships last, after vertice-api and vertice-bff. A build sending the
header to an older BFF gets an 8h token (the header is ignored), so mis-ordering degrades to
today's behavior rather than breaking.

## 5. Options

None beyond vertice-bff §5; renewal is client-side as in M1.

## 6. Testing strategy

`AuthProvider` tests: login, register and renewal send the header; renewal on launch when the token is
older than a day, not when fresher; no renewal offline; concurrent triggers renew once; a 401 on
renewal signs out with `expired` and keeps drafts; a legacy token restored without a stored expiry
is not renewed and does not sign out; a `NOT_RENEWABLE` refusal changes nothing; "Sair" still
clears. `ChangePasswordScreen`: success calls `signOut` with the new reason, drafts and the outbox
are kept, the login banner shows the new copy, and the "continua conectado" text is gone (M3).
Update `AuthProvider.tsx` comments and `CLAUDE.md`.

## 7. Rollout

Store build after the BFF is live. Older builds keep 8h sessions until updated (R18).

## 8. Effort and risk

Size S–M: login/register flag, renewal with its triggers and race guard, change-password UX,
tests, docs. Risk concentrated in M1.

## 9. Questions and assumptions

- Assumption: renewal at most daily, on launch/foreground (M1). Assumption: M3's message copy is
  confirmed in the spec.

## 10. Inputs to the spec

- [ ] Renewal: triggers, frequency, offline behavior, race guard, the stored expiry and never
  renewing legacy tokens (M1).
- [ ] Contract sync and sending the mobile-client header from login, register and renewal (M2).
- [ ] What the phone shows after changing its own password: the new sign-out reason and its copy (M3).
