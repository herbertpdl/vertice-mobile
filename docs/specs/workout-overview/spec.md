# Spec: Workout overview before starting

PRD: [`docs/prds/workout-overview/prd.md`](../../prds/workout-overview/prd.md) (Draft, PR #75).
Ticket: VRT-4. Design: `Vertice Web.pen`, row `Z0qzEO` (frames `dri2T`, `eJXmb`, `XnXD9`, `RYbCh`,
`Vj0aN`), component `M Exercise Overview Row` `kdNLl`. Builds on
[`client-workout-experience/spec.md`](../client-workout-experience/spec.md) §3.3–§3.8.

Mobile only. No API or BFF change: every call below already exists. One branch, one PR
(`feat/workout-overview`), no native rebuild.

## 1. Routing: one route, two views

The URL stays `/aluno/treino/[workoutId]`. The overview is a view of that route, not a new route.

- `WorkoutSessionScreen` (the route) renders the **overview** first, always (R1).
- Once a session is open, `SessionView` holds a `view: "overview" | "exercise"` state. The reducer,
  outbox writes, timers, notifications and the local store already live in `SessionView`; keeping
  both views under it means going back and forth (R23, R24) never remounts the session, and nothing
  has to be lifted into a shared store. A second route would need exactly that.
- **Back on the exercise view** (the NavBar arrow, "Ver todos", the iOS swipe, Android's back
  button) sets `view` to `"overview"` (R23, R24). The swipe and hardware back are caught with
  `usePreventRemove(view === "exercise" && !ended)` (the pattern `WorkoutEditorScreen` uses), so
  they don't pop the route. Finishing, discarding and switching set `ended` first, so their
  `router.replace` goes through.
- **Back on the overview** leaves the route: `router.back()`, else `router.replace("/aluno")` (R6).
  A session in progress stays in progress, as the ✕ does today (R7).
- Início keeps pushing `/aluno/treino/${id}`, so "Ver treino", "Continuar treino" and the picker
  all land on the overview with no change to their navigation (R1, E6).

## 2. Data: the overview never starts a session

`GET /workouts/{id}/session` starts a session when the week has none (its doc comment: "never fetch
it just to look"). The overview therefore reads, in this order:

1. **The local session** (`readLocalSession()` for this workout, with today's validity rules: not
   closing, this week). It opens at once. When the week's logs (below), fetched after the screen
   mounted, don't show that log as `IN_PROGRESS`, it was finished or discarded elsewhere: it's
   cleared and step 2 applies. Cached logs never clear it (Início's copy can predate the session).
   Without an answer (offline, network error, 5xx) the local session goes on, as today.
2. **The workout tree**, `fetchFullWorkout` under `fullWorkoutQueryKey(id)` (Início has it cached),
   for the rows and the header.
3. **The week's logs**, `fetchWorkoutLogs(tree.trainingPlanId, weekStartOf(today))` under
   `workoutLogsQueryKey` (also cached by Início), `refetchOnMount: "always"`. The workout's log
   gives the state:

| Log of this workout | State | What the overview renders |
|---|---|---|
| local session (step 1) | in progress | `SessionView` restored, `view: "overview"` |
| `IN_PROGRESS`, no local | in progress | `GET …/session` (it resumes; nothing starts), then `SessionView`, `view: "overview"` |
| `COMPLETED` | finished | `WorkoutOverview` from the tree, finished state |
| none | not started | `WorkoutOverview` from the tree |

**Opening an exercise before a session exists** (a row, "Começar treino", "Refazer treino"):

- Not started: `GET …/session` (this is when the session starts, R5), then `SessionView` with
  `view: "exercise"` at that exercise.
- Finished: the existing redo dialog ("Refazer este treino?", `Vj0aN`) first (R22). Confirm →
  `restartWorkoutSession` → `SessionView` at that exercise. Cancel stays on the overview (E5).
- Stale logs are safe: if `GET …/session` answers `COMPLETED`, the redo dialog shows (as today);
  if it answers another device's `IN_PROGRESS`, that session opens at the picked exercise.
- Offline with no local session: opening shows today's "Sem conexão" message as an error toast and
  stays on the overview (R55, E28, E3). The overview itself renders from the cache; with nothing
  cached it shows the "Sem conexão" `ErrorState`.

`initSession(snapshot, exerciseIndex?)` takes the picked index; without one it keeps today's
"first open exercise".

## 3. Engine additions (`src/lib/workoutSession/engine.ts`)

Pure, unit-tested:

- `firstOpenIndex` is exported (already exists): the "Continuar treino" target (R16).
- `overviewMain(state)`: `{ kind: "continue", index }` while a set is unticked, else
  `{ kind: "finish" }` (R16, R17, E7). Before a session the overview's button is "Começar treino" →
  index 0 (R15); finished, "Refazer treino" → index 0 (R21).
- `overviewRows(exercises, progress)`: per exercise in trainer order (R8) its 1-based position,
  name, sets text, thumbnail URL, muscle groups, and, when `progress` is given, `done`/`total`, a
  done flag (R12) and whether it's the current exercise. `exercises` is typed on the fields shared
  by `FullWorkoutExercise` and `WorkoutSessionExercise`, so the same function serves both sources.
- `stepRows` stays: the exercise view's progress segments use it.

`src/lib/workoutText.ts` gains `overviewSetsText(exercise)` (R10): `"3 × 45 s"` when every set is
timed with one duration; else `"4 séries · 10 reps"` with one rep count, `"4 séries · 8–10 reps"`
with a range, `"4 séries"` otherwise. No rest (the session line, `exerciseSummary`, keeps it).

## 4. Screens and components

**Kit: `ExerciseOverviewRow`** (`src/components/ui/ExerciseOverviewRow/`, `kdNLl`, added to the
`/kit` gallery): `ExerciseThumb` (placeholder without a video, E2), "EXERCÍCIO n" overline, name,
sets text, muscle-group tags, and on the right the progress ("2 de 4") with the chevron, or the
success check when done (progress turns success). `current` rings it in primary and turns the
progress primary. `progress` is optional: without it the right side is the chevron alone (R20). The
whole row is one button labelled "Exercício n: name. 2 de 4 séries" (R14, E1).

**`WorkoutOverview`** (in `WorkoutSessionScreen.tsx`, presentational, used by both the tree-backed
states and `SessionView`):

| Part | Not started (`dri2T`) | In progress (`eJXmb`, `XnXD9`) | Finished (`RYbCh`) |
|---|---|---|---|
| NavBar | "Visão geral", back, ⋮ | same | same |
| Overline | "TREINO DE HOJE · QUA" when the workout's day is today, else "TREINO DE QUA" | same | same |
| Summary | "6 exercícios · 22 séries" | "6 de 22 séries feitas" | "6 exercícios · 22 séries" |
| Note | — | — | "Concluído esta semana" (success) (R19) |
| Hint | "Toque em um exercício para começar por ele." | "Toque em um exercício para ir até ele." | as not started |
| Rows | no progress | progress, done, current (R11, R12) | no progress (R20) |
| Button | "Começar treino" | "Continuar treino" / "Finalizar treino" | "Refazer treino" |

The finished overview's rows show no count (R20); frame `RYbCh` was updated to match on 2026-11-16.

**⋮ actions** (R18): with a session in progress, "Trocar treino" and "Descartar treino" with today's
dialogs (`w9E18`, `C7nYt`). Before a session (not started or finished) there is nothing to discard:
the menu has "Trocar treino" only, and picking a workout replaces the route with that workout's
overview, with no confirmation.

**Exercise view** (today's session screen, R26–R28): the NavBar back and "Ver todos" go to the
overview; the ⋮ menu stays; "Próximo", auto-advance after the last set, rest, holds and finishing
are unchanged. The rest keeps running while the overview shows (it's the session's state, as it was
behind the sheet); its notification and alert still fire.

**"Finalizar treino" on the overview** runs today's `requestFinish` (with no sets left there is no
dialog, R17).

**Início** (`ClientHomeScreen.todayCard`): every card button that read "Começar treino" reads "Ver
treino" (R2); "Continuar treino" and "Treinar outro treino" stay (R3).

## 5. Removed

- `ExerciseListSheet` (domain) and the `"list"` overlay: the overview replaces it (R25).
- `ExerciseStepRow` (kit): only the sheet used it. Its kit gallery entry goes.

## 6. Tests

- Engine: `overviewMain` (continue to the first open exercise, finish with none left);
  `overviewRows` from a tree and from a session (progress, done, current); `initSession` with a
  picked index; `overviewSetsText` (timed, one count, range, mixed).
- `ExerciseOverviewRow`: label, progress, done check, no progress, press.
- `WorkoutSessionScreen`:
  - Not started: the overview renders from the tree and logs, and **no `GET …/session` is sent**;
    back leaves with no call (R4, E4); a row starts the session at that exercise (R5, R14);
    "Começar treino" opens the first one (R15).
  - In progress: "Continuar treino" opens the first exercise with an unticked set (R16); with all
    ticked the button is "Finalizar treino" and finishes (R17, E7); a done exercise opens (E1).
  - Finished: note, no progress, "Refazer treino"; the redo dialog shows only on opening, Cancel
    stays, back sends nothing (R19–R22, E5).
  - Exercise view: back and "Ver todos" return to the overview with the session intact (R23, R24).
  - The local session reopens on the overview offline (E3); offline with nothing local, opening an
    exercise says "Sem conexão".
  - The existing session tests open their exercise from the overview first.
- `ClientHomeScreen`: "Ver treino" (R2), "Continuar treino" kept (R3).

## 7. Decisions

| Question | Decision | Why |
|---|---|---|
| New route or a view of the session route? | A view (`view` state in `SessionView`) | The session's reducer, timers and outbox live there; going back and forth must not remount them. |
| Where does a not-started overview get its data? | The workout tree and the week's logs (Início's cached queries) | `GET …/session` starts a session (R4). |
| A local session the logs don't show as in progress | Cleared, then the logs decide | It was finished or discarded elsewhere; resuming it would write to a closed log. |
| ⋮ before a session | "Trocar treino" only, no confirmation | Nothing to discard; the PRD's confirmations are about a session in progress (owner confirmed). |
| R20 vs frame `RYbCh` ("0 de 4") | No progress on the finished overview; the frame was fixed | The PRD rule is explicit (owner confirmed). |
| Rest while on the overview | Keeps running, no timer drawn there | Same as behind the old sheet; the design has no timer on the overview (owner confirmed). |
