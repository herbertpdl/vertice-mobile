# Spec: Client workout experience (mobile client app)

> **Living document.** Agents implementing this spec update it as they go: tick the PR's
> checklist, fill in its PR number and status in [PR log](#pr-log), and record any decision or
> deviation in [Decisions log](#decisions-log). Read the whole file, and the PRD, before starting a
> PR.

- **PRD:** [`docs/prds/client-workout-experience/prd.md`](../../prds/client-workout-experience/prd.md).
  Rules are cited as `R<n>`, edge cases as `E<n>`. The PRD wins on *what*; this file decides *how*.
- **Repo:** vertice-mobile (Expo SDK 57, React Native 0.86, Expo Router, TypeScript). Every rule in
  [`docs/specs/mobile-app/spec.md` §0.1](../mobile-app/spec.md#01-rules-every-new-screen-follows-digest-of-the-decisions-log)
  applies here unchanged unless this file says otherwise.
- **Design source:** pen.dev file `/Users/herbertlago/Documents/Vertice Web.pen`, read **only**
  through the `pencil` MCP tools. Client screens are rows H–K of `O3tUmW` (prefix `A - `), the
  trainer-side changes are in row L, and the new kit components are in the `Aluno Row — …` rows of
  `Tskd4`. PRD §10 maps every frame to its rules, and §3 below maps them to code.
- **Other repos:** this feature needs contract changes in vertice-api, vertice-bff and
  vertice-web-react (§2). Each of those repos gets its own spec, derived from §2. **No mobile PR
  that needs a §2 change merges before the BFF change is merged and `.bff-ref` is bumped.**

## 0. Handoff — start here

**State (2026-10-23):** PRs 15–17 are merged on mobile; the backend is merged: vertice-api #73
(session lifecycle, rating) and #74 (trainer contacts, YouTube-only videos), and vertice-bff #50
(B1–B10). PR 18 (session + feedback) is in review on `feat/client-workout`. **Next:** PR 19
(offline outbox), then PR 21 (trainer side + the client's trainer card), then vertice-web-react's
§2.4 items.

**Per-PR loop:** the same as in the trainer spec's §0. Read the pen.dev nodes for the PR (values
from `Get(id, {depth: 5})`, never from screenshots). Implement and test. Run every CI command
green. Open the PR, then have a fresh agent run the `code-review` skill (with this spec plus the
PRD as the spec). Fix the blocking findings, and log the rest here.

## 1. Scope

**In scope:** the whole PRD.
- On mobile: the client app (rows H–K) and the trainer-side mobile changes (row L).
- In the other repos: the contract changes those need (§2).

**Out of scope:** the PRD's §6 list. Also out:
- Web *designs*. PRD §10.4 lists them as not drawn yet. The web spec draws them first, following
  row L.
- Push notifications from the server. Only on-device local notifications are used (R50).

## 2. Cross-repo contract changes

Each item lists the rules that need it. Field and route names are proposals. The BFF spec may
rename them, but `npm run api:types` is the only way they reach this repo (XREPO-013), so mobile
code follows whatever the BFF merges.

### 2.1 What already exists (no change needed)

| Need | Existing route (at the pinned `.bff-ref`) | CLIENT allowed |
|---|---|---|
| The client's plans (R1, R10) | `GET /api/training-plans` (a CLIENT's `clientId` is ignored) | yes |
| A plan, and its workouts (R11, R16) | `GET /api/training-plans/{id}`, `GET /api/training-plans/{planId}/workouts` | yes |
| A workout read-only (R11) | `GET /api/workouts/{id}/full` | yes |
| Start or resume, plus last time's values (R13, R25, R35) | `GET /api/workouts/{workoutId}/session`. It **creates** this week's log, so call it only when training starts, never just to view a workout | yes |
| This week's done and in-progress workouts (R6, R8) | `GET /api/workout-logs?trainingPlanId=` (`startedAt`, `completedAt`) | yes |
| Ticking a set (R44) | `POST /api/workout-sessions/{logId}/sets` | CLIENT only |
| Finishing (R44) | `POST /api/workout-sessions/{logId}/complete` (idempotent) | CLIENT only |
| Exercise progress (R63) | `GET /api/exercises/{id}/progress` (finished sessions only, heaviest per week) | yes |
| An exercise's video URL | `Exercise.videoUrl`, included in the session and full-workout responses | yes |

### 2.2 vertice-api

- **A1. Session lifecycle** (R20–R28, R38). Workout logs get a `status`: `IN_PROGRESS`,
  `COMPLETED` or `SUPERSEDED`.
  - The `UNIQUE (workout_id, client_id, week_start_date)` constraint becomes two partial unique
    indexes: at most one `IN_PROGRESS` and at most one `COMPLETED` per workout, client and week.
  - Get-or-start keeps its behavior: resume `IN_PROGRESS`, else return the week's `COMPLETED` log,
    else create one.
  - New **restart** creates an `IN_PROGRESS` log next to the week's `COMPLETED` one (R20, R21).
  - **Complete** marks the week's other `COMPLETED` log `SUPERSEDED` in the same transaction (R22).
  - New **discard** deletes an `IN_PROGRESS` log and its set logs (R19, R23, R26).
  - New **delete set log** unticks a set (R38). It's refused on a completed log, like recording is.
  - "Last time" values (R35) come from the latest `COMPLETED` log only.
- **A2. Blank weight** (R34). A set log's weight becomes optional, so a ticked set can exist
  without a weight. Progress already skips empty weights.
- **A3. Week rollover** (R27, R28). A scheduled job runs at 00:05 every Monday, São Paulo time:
  - Each `IN_PROGRESS` log from an earlier week is completed if it has at least one set log. It
    takes a `completion_kind = AUTO` and supersedes the week's earlier `COMPLETED` log, like any
    finish.
  - A log with no set logs is deleted instead.
  - Start and list run the same rule for their client before answering, so the job's lag never
    shows.
- **A4. Feedback rating** (R66–R72):
  - `rating` (`VERY_HARD`, `HARD`, `JUST_RIGHT`, `EASY`, `VERY_EASY`) is required on new feedback.
    Existing rows keep `NULL`.
  - `text` becomes optional (0–2,000 characters).
  - Feedback lists return `rating` plus a computed `replaced` flag, true when the log is
    `SUPERSEDED` (R24).
  - The current limits stay: feedback only on a completed log, at most 10 per log.
- **A5. Trainer contacts** (R74–R79):
  - Trainers get optional `whatsapp` (a Brazilian mobile number, digits only) and `instagram` (a
    handle without `@`).
  - Three booleans control what clients see: `show_email`, `show_whatsapp`, `show_instagram`. All
    default to `false` (see the decisions log).
  - New RPC: the client's *active* trainer (from `trainer_clients` where `ended_at IS NULL`). It
    returns the name and only the contacts that are both filled in and shown. No active trainer
    means not found.
- **A6. YouTube-only videos** (R61). Creating or updating an exercise rejects a `videoUrl` that
  isn't YouTube (the same parser as `src/lib/video.ts`'s `youtubeVideoId`). Existing rows are
  untouched (R62 is handled on display, §3.6).
- **A7. LGPD:** `docs/data-inventory.md` and the data export gain the rating, the contact fields and
  the visibility flags. Account deletion clears the contacts.

### 2.3 vertice-bff

| # | Change | Rules |
|---|---|---|
| B1 | `POST /api/workouts/{workoutId}/session/restart` (CLIENT) → `WorkoutSession` with the new `IN_PROGRESS` log | R20 |
| B2 | `DELETE /api/workout-sessions/{logId}` (CLIENT, own `IN_PROGRESS` log) → 204; 409 when completed | R19, R26 |
| B3 | `DELETE /api/workout-sessions/{logId}/sets/{exerciseSetId}` (CLIENT) → 204; 409 when completed | R38 |
| B4 | `RecordSetLogRequest.weight` accepts `""` | R34 |
| B5 | `WorkoutLog` gains `status` and `completionKind` (`CLIENT` / `AUTO`); `GET /api/workout-logs` leaves out `SUPERSEDED` logs | R6, R8, R27 |
| B6 | `WorkoutSession` sets gain `current: SetLog \| null` (this log's record), so another device or a reinstall can resume | R25 |
| B7 | `SubmitFeedbackRequest { rating, text? }`; `WorkoutFeedback`/`EnrichedFeedback` gain `rating` (nullable) and `replaced` | R66–R72, R24 |
| B8 | `GET /api/auth/me/trainer` (CLIENT) → `{ name, email?, whatsapp?, instagram? }`; 404 with no active trainer | R74–R76, R79 |
| B9 | `Me` (TRAINER) and `PATCH /api/auth/me` gain `whatsapp`, `instagram`, `showEmail`, `showWhatsapp`, `showInstagram` | R77, R78 |
| B10 | `ExerciseRequest.videoUrl`: YouTube only (`VALIDATION_ERROR` on the field) | R61 |

`errorMessages.ts` (mobile) gets pt-BR copy for any new error code the BFF adds.

### 2.4 vertice-web-react

These follow the mobile trainer designs (row L) until web frames exist:
- The rating chip and the "Sessão substituída" tag on every feedback view (R71, R72, R24).
- WhatsApp and Instagram fields, plus "mostrar aos alunos" switches, in profile edit (R77, R78).
- YouTube-only validation in the exercise form (R61).

## 3. Mobile architecture

### 3.1 Routing and the role gate

- `useSessionGate` returns `ready` for `TRAINER` **and** `CLIENT`, with the role. `ADMIN` keeps
  `RoleNoticeScreen`.
- `(app)/_layout` wraps the trainer routes in `<Stack.Protected guard={role === "TRAINER"}>` and
  the new `aluno` routes in `<Stack.Protected guard={role === "CLIENT"}>`. The client's routes live
  under the URL `/aluno` so they never collide with the trainer's `(tabs)/index` at `/`. Check the
  fallback-to-first-accessible-screen behavior against the SDK 57 Expo Router docs before relying on
  it, as the root layout already does for `login`.

```
src/app/(app)/aluno/
  _layout.tsx                 Stack
  (tabs)/_layout.tsx          TabBar (client variant: Início, Planos, Perfil)
  (tabs)/index.tsx            → ClientHomeScreen
  (tabs)/planos.tsx           → ClientPlansScreen
  (tabs)/perfil.tsx           → ClientProfileScreen
  planos/[id].tsx             → ClientPlanScreen (read-only)
  treinos/[id].tsx            → ClientWorkoutViewScreen (read-only, /full)
  treino/[workoutId].tsx      → WorkoutSessionScreen (gestureEnabled: false; leaving is the ✕)
  treino/feedback/[logId].tsx → WorkoutFeedbackScreen (no back gesture: leaving is "Pular")
  perfil/senha.tsx, perfil/excluir-conta.tsx → re-export the existing screens
```

Screens live in `src/screens/client/`. The trainer's Perfil sub-screens are reused, not copied.
`DeleteAccountScreen` already handles a client account (no "alunos ativos" branch for a client;
verify it).

### 3.2 Data

New API modules (one per resource, query keys exported there, every `queryFn` takes `{ signal }`):

| Module | Exports |
|---|---|
| `src/lib/api/workoutSessions.ts` | `workoutSessionQueryKey(workoutId)`, `fetchWorkoutSession`, `restartWorkoutSession` (B1), `recordSetLog`, `deleteSetLog` (B3), `completeWorkoutLog`, `discardWorkoutLog` (B2), `workoutLogsQueryKey(planId, weekStart)`, `fetchWorkoutLogs` |
| `src/lib/api/feedback.ts` (extend) | `submitFeedback(logId, { rating, text })` |
| `src/lib/api/auth.ts` (extend) | `myTrainerQueryKey`, `fetchMyTrainer` (B8); `updateProfile` body gains the B9 fields |
| `src/lib/api/trainingPlans.ts`, `workouts.ts` | reused as-is (a client's calls return their own plans) |

- **Dates.** `src/lib/calendar.ts` gains `weekStartOf(isoDate)` (the Monday) and
  `dayOfWeekOf(isoDate)` (→ the generated `DayOfWeek`).
  - Both are computed on business dates, never through a local `Date`, and both are covered by
    `test:hostile-tz` (R4).
  - "Today" is `todayLocalIso()` only.
  - The week strip's numbers come from `addDays(weekStart, i)`.
- **Active plan** (R1, R2). `src/lib/plans.ts` gains `activePlan(plans, today)`: the plan where
  `planStatus` is `"active"`, picking the latest `startDate` on ties. The same helper drives Início
  and the "Em andamento" group in Planos.
- **Week status** (R6). A pure `weekStrip(workouts, logs, weekStart, today)` returns one of `done`,
  `today`, `pending` or `rest` per day. A day is done when a log for a workout on that weekday has
  `completedAt`. This works today; with B5, logs leave out superseded ones.
- **In progress** (R8). This is a log with `startedAt` and no `completedAt` in this week's list, or
  the local session store (§3.4) when it holds one, so it also works offline. When both exist, the
  local store wins.
- **Labels.** Rating labels (`Muito difícil` … `Muito fácil`) are keyed by the generated rating
  enum in `src/lib/labels.ts`.

### 3.3 Workout session engine (`src/lib/workoutSession/`)

A pure reducer plus selectors, with no React or I/O, unit-tested on its own:

```ts
type SessionState = {
  snapshot: WorkoutSession;          // frozen when the session opens (R29)
  logId: number;
  ticks: Record<number, { weight: string }>;   // by exerciseSetId; weight "" = none (R34)
  weights: Record<number, string>;   // field values, ticked or not
  exerciseIndex: number;
  rest: { setId: number; endsAt: number } | null;   // epoch ms
  hold: { setId: number; endsAt: number } | null;
};
```

- **Initial weight** (R35–R37). In order: `set.current?.weight` (B6), then
  `set.lastPerformed?.weight`, then `set.weight`, then `""`. The hint shows `lastPerformed` only.
  Weights stay decimal strings end to end ("do not round-trip through a float"). Input uses a pt-BR
  comma, is validated against the web's weight bound (0–999, 2 decimals, `src/lib/validation`),
  and is sent with a dot.
- **Actions:**
  - `tick(setId, now)`: records the set, replaces `rest` with this set's rest (none when 0), and
    clears `hold` (R45, R46, R48).
  - `untick(setId)` (R38).
  - `setWeight`.
  - `goTo(index)`: ends `rest` (R48).
  - `next()`: the first exercise, in order, with an unticked set (R39).
  - `startHold(setId, now)` and `holdEnded(now)`: holdEnded ticks the set, which starts its rest
    (R52, R53).
  - `restEnded`.
- **Selectors:** `isLastStep` (every set ticked → "Finalizar treino", R40), `pendingSets` (for the
  R43 dialog), `progress` (segments, "Exercício n de m"), and `stepRows` (for "Ver todos", R41).
- **Version freeze** (R29). The screen renders `snapshot` only, never a refetched session. The
  session query is fetched once per opening, with `staleTime: Infinity` while the screen is
  mounted.

### 3.4 Persistence and offline (R55–R58)

- **Storage.** `expo-sqlite/kv-store` (new dependency, `npx expo install expo-sqlite`). It holds
  workout data only, never the token (that stays in SecureStore). Keys carry the user id:
  - `session:<userId>`: the `SessionState`. It's written on every change, debounced 300 ms and
    flushed on `AppState` background. It's restored when the session screen opens and from Início.
  - `outbox:<userId>`: an ordered list of operations: `recordSet`, `deleteSet`, `complete`,
    `discard` and `feedback`.
- **Sending.**
  - Every action goes into the outbox first. A single sender sends operations in order: on enqueue,
    when `onlineManager` comes back online, and on app start.
  - Workout calls use the outbox instead of the trainer app's "fail fast offline" rule: this screen
    is the exception, and the decisions log records it.
  - 401 → stop. The session ends, as everywhere else, and the outbox stays for that user.
  - 429 → retry after `retryAfter`.
  - 5xx or network error → back off and retry.
  - Any other 4xx → drop the operation and report a scrubbed Sentry event carrying only the error
    code and the operation type, never weights or text.
- **Starting needs a connection.** `GET …/session` and restart (B1) are not queued. Offline, "Começar
  treino" shows the offline error unless the local store already holds that session (R55, E28).
- **Banner.** The offline banner (`StatusBanner kind="offline"`, without "Tentar") uses the R57
  copy.
- **After a sync.** When the outbox drains, invalidate `workoutLogsQueryKey`, the plans list and
  `workoutSessionQueryKey`.
- **Clearing.**
  - Sign-out ("Sair"), account deletion and a different user signing in clear both keys.
  - A 401 sign-out keeps them, like `draftStash`, so a re-login resumes the session.
  - A finished or discarded session is removed from `session:` once its `complete` or `discard`
    operation is sent.
- **Sets the trainer deleted mid-session** (R29, E15). Recording one comes back as a 400. The
  sender drops it, so that weight is lost, while the client's screen stays as they started it. This
  is an accepted gap, recorded in the decisions log.

### 3.5 Rest timer, holds and alerts (R45–R54)

- **Clock.** The time is derived from `endsAt` and `Date.now()` in a 250 ms interval while the
  screen is focused. It's never a counted-down integer, so backgrounding, locking and reopening
  stay correct. Tests inject `now`.
- **Local notification** (`expo-notifications`, new dependency).
  - On `tick`, schedule a `TIME_INTERVAL` notification for the rest seconds: title "Descanso
    terminou", body "Hora da série N de <exercício>".
  - Cancel it on the next `tick`, on `goTo`, on discard, on finish, and when the app returns to the
    foreground after it fired.
  - Holds don't notify (the client is holding the position, with the app open).
  - Ask for permission on the first tick of a client's first session. A denial is silent, and only
    the in-app alert is used (R51).
  - `setNotificationHandler` returns no banner and no sound while the app is active, so the in-app
    alert is the only one (no double alert).
- **In-app alert** (R49). `expo-haptics` `notificationAsync(Success)` plus a short sound through
  `expo-audio` (new dependency) with `playsInSilentMode: false` and `interruptionMode:
  "mixWithOthers"`, so it respects the ringer switch and doesn't stop the client's music. The sound
  is a bundled `assets/sounds/rest-done.mp3` (under 30 KB, license recorded in the PR).
- **Out of scope:** no keep-awake and no lock-screen live activity (not in the PRD).

### 3.6 Video (R59–R62)

- **Player.** `VideoSheet` (domain): a kit `Sheet` with `react-native-webview` (new dependency,
  `npx expo install`) loading `https://www.youtube-nocookie.com/embed/<id>?playsinline=1`. Nothing
  else may load: navigation outside that origin is blocked. Future uploaded videos will use the
  same sheet (PRD §6).
- **Rest keeps running.** The rest timer stays docked in the sheet, because the session state lives
  above it (R60).
- **Who sees "Ver execução".** It shows only when `youtubeVideoId(videoUrl)` is non-null, for clients
  (R62). The trainer screens keep today's behavior until the R61 validation lands.
- **Retiring `useOpenVideo`.** The client app never calls the external `useOpenVideo`. Once A6/B10
  merge, the trainer screens switch to `VideoSheet` too, and `useOpenVideo` and its external-link
  chip go.

### 3.7 Screens and components

**New kit components** (`src/components/ui/`, one folder each, also added to the `/kit` gallery):

| pen.dev | Component | Notes |
|---|---|---|
| `M Tab Bar Aluno` `u7l9GT` | the existing `TabBar` | no change: it draws whatever tabs the router declares, so the client's `(tabs)/_layout` with three screens is the whole "variant" |
| `M Week Day` `oPKy0` (+ Done/Today/Rest) | `WeekDay` `state` | |
| `M Week Strip` `K1kwAJ` | `WeekStrip` | takes `weekStrip()` output |
| `M Workout Set` `bcq0b` (+ Done/Current/Timed/Holding) | `WorkoutSetRow` | weight input, check, hold button; 44 pt targets |
| `M Rest Timer` `VET5R` | `RestTimer` | |
| `M Exercise Step Row` `A5U95x` (+ Done/Current) | `ExerciseStepRow` | |
| `M Workout Pick Row` `uKGLm` (+ Done/Today/Unavailable) | `WorkoutPickRow` | |
| `M Switch` `mxJuO` / `M Switch Off` `GxxUW` | `Switch` | `accessibilityRole="switch"` |
| `M Emoji *` (48 px, 20 px) | `RatingEmoji` `rating` `size` | `react-native-svg`; `emojiArt.ts` is generated by exporting the five components with the pencil `Export(…, "html-css")` and converting each layer (ellipse / path + viewBox) to a 48×48 shape list |
| `M Rating Option` / `M Rating Scale` `CtsNy` | `RatingScale` | radio group, `accessibilityRole="radiogroup"` |
| `M Rating Chip` `Yjc55` | `RatingChip` | |

**Domain:** `ActivePlanCard` (with today / in progress / done / rest / no-workouts states),
`WorkoutPickerSheet`, `ExerciseListSheet`, `VideoSheet`, `ProgressSheet` (reuses `WeightChart`),
`TrainerContactCard`. `FeedbackRow` gains `rating` and `replaced` (R71, R72).

**Screens → frames:**

| Screen | Frames |
|---|---|
| `ClientHomeScreen` | `mVtAC`, `AeMud`, `p1coh`, `mNzVn`, `Z1jxfC`, `jsmVN` (+ skeleton like the trainer's Dashboard Loading) |
| `WorkoutPickerSheet` | `uJHG8` |
| `WorkoutSessionScreen` | `J7lff0`, `HSlcu`, `Ehxuh`, `WuQUK`, `vL3cB`; ⋮ → `a4aH7F`; dialogs `KA0dH`, `w9E18`, `TQpim`, `C7nYt` |
| `ExerciseListSheet` / `VideoSheet` / `ProgressSheet` | `qskC8` / `DlKX6` / `Lnp7p` |
| `WorkoutFeedbackScreen` | `Z5VFj8`, `Q9F3s` |
| `ClientPlansScreen` / `ClientPlanScreen` / `ClientWorkoutViewScreen` | `TJLLJ` / `G4tdAR` / `YT9QM` |
| `ClientProfileScreen` | `UkVWg` |
| Trainer: `EditProfileSheet` / exercise form / `FeedbackRow` | `Ls7a6` / `Ctbzl` / `goaCq` |

### 3.8 Flow details

- **Início.** The main button's target:
  - With an in-progress session, it continues that session (R8).
  - With exactly one unfinished workout today, it opens that workout.
  - With today's workout done, it opens the picker ("Treinar outro treino").
  - Otherwise (no workout today, or several), it opens the picker (R13–R15).
- **Picker.** Rows are ordered by weekday and today's row is highlighted. Done rows lead to the
  `TQpim` dialog and then to restart (B1). Rows without exercises are disabled (R17).
- **Opening a workout.** `GET …/session` runs first.
  - A log with `completedAt` coming back means the workout is already done this week. The app shows
    `TQpim`, then calls restart, and navigates on its result.
  - A different `IN_PROGRESS` session held locally means the client is switching (R19): with any
    ticks, `w9E18` confirms; then the old session is discarded (an outbox operation) before the new
    one starts.
- **✕ on the session screen.** It goes back to Início and keeps the session in progress (R25).
  Discarding is ⋮ → Descartar → `C7nYt` → discard → Início (R26).
- **Finish.**
  1. If `pendingSets > 0`, `KA0dH` confirms first (R43).
  2. Queue `complete`.
  3. Navigate to the feedback screen, replacing the session screen in history.
  4. "Enviar" queues `feedback` and goes to Início with a toast. "Pular" goes to Início (R65–R70).
  5. A session the week rollover finished never reaches this screen (R27).

## 4. PR plan

PRs are stacked as in the trainer spec. Every PR keeps all CI commands green (`typecheck`,
`lint -- --max-warnings 0`, `test`, `test:hostile-tz`, `tokens:check`, `api:types -- --check`,
`expo install --check`, `expo-doctor`), then gets the fresh-agent `code-review` loop.

### PR 15 — `docs/client-workout-spec`: this spec
- [x] `docs/prds/client-workout-experience/prd.md` and this file
- [x] Pointer from `docs/specs/mobile-app/spec.md` §1 ("Client experience → this spec") and from
  `CLAUDE.md`'s project status

### PR 16 — `feat/client-kit`: kit components (no backend change)
- [x] Every component in §3.7's kit table, each with its test, in the `/kit` gallery (`WeekStrip`,
  `WorkoutSetRow`, `RestTimer`, `ExerciseStepRow`, `WorkoutPickRow`, `Switch`, `RatingEmoji`,
  `RatingScale`, `RatingChip`); sizes in `mobile.ts`, presets `timer` / `eyebrow` / `tiny`,
  `shadows.restTimer`
- [x] `RatingEmoji` artwork from pen.dev (`emojiArt.ts`), with a test per rating
- [x] Rating labels in `labels.ts` (`FeedbackRating`, `RATING_ORDER`, `RATINGS`). Keyed by a local
  union until B7's enum lands; the swap is a one-line change in PR 20.

### PR 17 — `feat/client-shell`: routing, Início, Planos, Perfil (existing endpoints)
- [x] `useSessionGate` + `(app)/_layout` role groups (§3.1): `TRAINER` → `(tabs)` and every trainer
  route, `CLIENT` → `aluno` (`/aluno`), `perfil/senha` and `perfil/excluir-conta` open to both,
  `ADMIN` keeps the notice (new copy); `src/test/roleRouting.test.tsx` renders the real layout
  per role (homes, deep-link fallbacks)
- [x] `activePlan` (`plans.ts`), `weekStartOf` / `dayOfWeekOf` (`calendar.ts`, hostile-tz tested),
  `clientWeek` / `homeAction` (`src/lib/clientWeek.ts`), `formatWeekdayDate`, and
  `src/lib/workoutText.ts` (set/exercise copy, reused by PR 18)
- [x] `ClientHomeScreen` with `ActivePlanCard` and `WorkoutPickerSheet`: start / continue (from the
  week's server logs) / done → "Treinar outro treino" / no workout today → picker with notice /
  several today → picker / no workouts → disabled; no active plan → empty state; skeleton, error,
  offline and pull-to-refresh. Exercise counts come from each workout's `/full` (the plan detail
  has none; at most seven cached requests)
- [x] `ClientPlansScreen` (grouped Em andamento / Próximos / Encerrados), `ClientPlanScreen`
  (read-only notice; `DayRow` without "+ Adicionar treino"), `ClientWorkoutViewScreen` (`/full`)
- [x] Perfil reuses `ProfileScreen` (no "Editar perfil" for a client) and the trainer's password and
  delete-account screens (`consequencesFor` drops the trainer-only line); the trainer card waits
  for PR 21
- [x] "Começar treino" opens `/aluno/treino/[workoutId]`, a placeholder until PR 18
- [x] `Button` variant `ghostDanger` (A - Início's "Descartar treino", wired in PR 18)

### PR 18 — `feat/client-workout`: the session and feedback (B1–B7 merged, `.bff-ref` at vertice-bff `acb90ab`)
- [x] `src/lib/api/workoutSessions.ts` (session, restart, record/untick, complete, discard) and
  `submitFeedback`; the generated contract adopted (`WorkoutLog.status`/`completionKind`, per-set
  `current`, `FeedbackRating`, `ClientTrainer`)
- [x] Engine (`src/lib/workoutSession/engine.ts`, §3.3) with unit tests: weights (API decimals
  ↔ pt-BR field), initial weight (R35, R36), tick/rest/untick/goTo/next/holds (R38–R54),
  selectors
- [x] `WorkoutSessionScreen` (all frames): "Ver todos" (`ExerciseListSheet`), ⋮ → Trocar /
  Descartar, the four dialogs, redo of a finished workout, switching (discards the current
  session), finish → feedback (skipped for an automatic finish), Início's "Descartar treino"
- [x] Rest timer and holds from end timestamps; `expo-notifications` local notification,
  `expo-haptics` and `expo-audio` (`assets/sounds/rest-done.wav`, generated here, no
  third-party license) (§3.5); `app.json` plugins; `ConfirmDialog` gets `confirmVariant` and the
  `info` tone
- [x] `VideoSheet` (`react-native-webview`, youtube-nocookie embed, navigation locked) and
  `ProgressSheet`
- [x] `WorkoutFeedbackScreen` (`/aluno/treino/feedback/[logId]`): rating required, optional
  text, "Pular" (PR 20 folded in, now that B7 is merged)
- [ ] Device checklist: rest notification with the phone locked (iOS + Android), permission
  denied, silent switch, music keeps playing, a 10-minute background then reopening. **Needs a
  native rebuild** (`npm run ios` / `npm run android`): new native modules.

### PR 19 — `feat/client-offline`: persistence and outbox (§3.4)
- [ ] `expo-sqlite` kv-store; `session:` and `outbox:` keyed by user; clearing on sign-out,
  deletion and user switch; kept on a 401
- [ ] Sender with ordering, backoff, `retryAfter` and drop-on-4xx with a scrubbed report; drain →
  invalidations
- [ ] Offline banner on the session screen; first open offline → offline error (E28)
- [ ] Tests: a queued tick/untick/complete/feedback sequence survives a restart and replays in
  order; a 400 for a deleted set is dropped; a 401 keeps the outbox
- [ ] Device checklist: airplane mode mid-workout → finish → feedback → reconnect

### PR 20 — folded into PR 18
The feedback screen shipped with the session once B7 merged.

### PR 21 — `feat/trainer-client-facing` (needs B7–B10)
- [ ] `FeedbackRow` rating chip, "Sem comentário", "Sessão substituída" (`goaCq`) on Início,
  Feedbacks and the student's Feedbacks tab
- [ ] `EditProfileSheet` contacts + switches (`Ls7a6`), with validation mirroring the BFF's
- [ ] Exercise form: YouTube-only (`Ctbzl`); trainer video opening through `VideoSheet`, and
  `useOpenVideo` removed
- [ ] `TrainerContactCard` on the client's Perfil (B8): mail, `https://wa.me/55<digits>`,
  `https://instagram.com/<handle>` through `Linking`; hidden on a 404

## 5. Merge and deploy order

1. **vertice-api** A1–A7, including the migration that replaces the unique constraint with the
   partial indexes (existing rows become `COMPLETED` or `IN_PROGRESS` from `completed_at`).
2. **vertice-bff** B1–B10, deployed **before** any mobile release that uses them. Old app builds
   keep working:
   - The routes they already call keep their shapes.
   - B4 only loosens a request.
   - B7's `rating` is required, which breaks no shipped client: no shipped build submits feedback,
     since the trainer app never does.
3. **Mobile:** PRs 16–17 can merge any time. PR 18 onward waits for step 2, a `.bff-ref` bump and
   `npm run api:types`.
4. **Web** (§2.4) after step 2, independent of mobile.

**Rollback:**
- Mobile: revert the PR. With no client build released, nothing depends on it.
- BFF/API: the new routes are additive, but the rating and status columns aren't easily dropped,
  so roll forward.

## PR log

| PR | Branch | GitHub | Status | Review |
|---|---|---|---|---|
| 15 | `docs/client-workout-spec` | [#33](https://github.com/herbertpdl/vertice-mobile/pull/33) | merged | docs only; CI green |
| 17 | `feat/client-shell` | [#35](https://github.com/herbertpdl/vertice-mobile/pull/35) | merged | 3 review rounds: 1 blocking (refresh without a plan) + 5 non-blocking (trainer routes guarded, routing test, copy, banner, profile fallback), all fixed; approved |
| 16 | `feat/client-kit` | [#34](https://github.com/herbertpdl/vertice-mobile/pull/34) | merged | 5 review rounds: 3 blocking (narrow-screen fit, fixed-height rows, clipped weight) + 4 non-blocking, all fixed; approved |

## Decisions log

- 2026-10-22 — Client routes live under `/aluno` with role-guarded `Stack.Protected` groups, not
  under the trainer's `(tabs)`. Two groups can't both own `/`, and keeping the trainer's URLs
  unchanged avoids touching every trainer test.
- 2026-10-22 — Workout calls go through a persisted outbox instead of the trainer app's "fail fast
  offline" mutation rule. R56–R58 require training without a connection. Every other mutation in
  the app keeps the old rule.
- 2026-10-22 — Workout state is persisted in `expo-sqlite/kv-store`, keyed by user and cleared on
  deliberate sign-out, deletion and user switch.
  - Weights are the client's own training data, and the app sandbox is acceptable for them. The
    token stays in SecureStore.
  - The store is kept across a 401 so a re-login resumes the session (the same reason as
    `draftStash`, which can't be memory-only here because the PRD requires surviving an app kill,
    R25).
- 2026-10-22 — R29 (finish on the version started) is met on screen through a frozen snapshot. A
  weight for a set the trainer deleted mid-session can't be stored and is dropped at sync (accepted
  gap). Fixing it would need set snapshots server-side, which the PRD doesn't ask for. The owner
  accepted the gap (2026-10-22) over keeping set snapshots or blocking trainer edits mid-session.
- 2026-10-22 — Reps aren't recorded (PRD), but the BFF requires `reps` on a set log, so the app
  sends the prescribed reps (0 for a timed set). Progress uses weight only, so nothing reads them.
- 2026-10-22 — Week rollover in vertice-api is a Monday job plus a lazy pass on start/list.
  - The job alone would show stale in-progress sessions until it runs; the lazy pass alone would
    leave trainer views stale for inactive clients.
  - An auto-finished session counts as a finish, so it replaces that week's earlier completion
    (R22 applied to R27). Confirmed by the owner (2026-10-22): an unfinished redo that the week
    rollover finishes replaces the original.
- 2026-10-22 — The rest alert is a local `expo-notifications` notification plus in-app haptics and
  sound, with no server push. The app's notification handler suppresses banners while the app is
  active, so the client never gets the alert twice.
- 2026-10-22 — The YouTube player is a `react-native-webview` iframe on `youtube-nocookie.com`
  rather than a YouTube SDK wrapper: one native dependency Expo ships, and the same sheet can later
  play uploaded files.
- 2026-10-22 — Trainer contacts default to hidden (`show_* = false`). The PRD lets the trainer
  choose but doesn't say the starting state, and sharing personal contacts by default would be the
  LGPD-unfriendly choice. Confirmed by the owner (2026-10-22).
- 2026-10-22 — The client's trainer is the *active* `trainer_clients` relationship. A client has at
  most one (a unique index). With none, the Perfil card is hidden (E36 covers hidden contacts, not a
  missing trainer).
- 2026-10-22 — The feedback emojis keep the artwork's own colors (close to, but not exactly,
  `danger`/`warning`/`info`/`success`/`secondary`, plus dark feature colors) in `emojiArt.ts`. They are
  illustrations, like the app icon, not UI color, so they stay out of the theme.
- 2026-10-22 — `WorkoutSetRow`'s weight is a bare `TextInput` inside the M Workout Set box rather
  than the kit `TextField`: the design has no label or help row, and the field must stay 84 pt wide
  inside a 68 pt row. Its spoken label is "Carga da série N, em quilos".
- 2026-10-22 — The client's Início reads the week's logs from `GET /api/workout-logs` and counts
  exercises from each workout's `GET /api/workouts/{id}/full`, because the plan detail carries no
  counts. A plan has at most seven workouts and the trees are cached. A `workoutCount` field on the
  plan's workouts in the BFF would remove the requests if this ever matters.
- 2026-10-22 — Every trainer route sits under the TRAINER `Stack.Protected` guard (not just
  `(tabs)`), so a client's stale or deep link to one falls back to `/aluno`; `perfil/senha` and
  `perfil/excluir-conta` stay shared and fall back to the role's own Perfil (`useProfileHome`).
- 2026-10-22 — The client's screens can't be checked on react-native-web after sign-in:
  `expo-secure-store` has no web implementation, so login fails there. The kit gallery is the web
  check; the screens are covered by tests and by the device checklists.
- 2026-10-23 — Until PR 19's outbox, the session's writes go straight to the BFF. The screen
  keeps the client's ticks and weights locally even when a call fails, and a failure only shows a
  toast. A weight edit on a ticked set is re-recorded after 800 ms.
- 2026-10-23 — The weekly rollover closes a session the client left open. When the client then
  finishes it, `CompleteWorkoutLog` returns it with `completionKind: "AUTO"` (it's idempotent),
  and the app goes home without the feedback step (R27).
- 2026-10-23 — Before PR 19, each set's writes are chained per set (an untick's DELETE always
  lands before a re-tick's POST). Finishing first sends any pending weight edit and waits for every
  write. Leaving the screen any way sends a pending edit at once. A finished or discarded session
  sends nothing more.
- 2026-10-23 — The in-app rest alert plays only when the end is seen live. If the end is first
  seen on the return from the background, the rest ends silently and the delivered notification is
  cleared, since it already was the alert. On iOS, a dialog opened from a sheet ("Ver todos" →
  Finalizar, Trocar → a workout) opens from the sheet's `onDismiss`, as in `ActionSheet`.
- 2026-10-23 — The video WebView keeps the youtube-nocookie `/embed/` page as its top frame:
  youtube.com may load only in sub-frames. The embed loads with `Referer:` set to the app's web
  origin (`EXPO_PUBLIC_WEB_URL`), because YouTube refuses Referer-less embeds (error 153). Check
  this on the device checklist.
