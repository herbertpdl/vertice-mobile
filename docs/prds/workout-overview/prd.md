# PRD: Workout overview before starting

Status: Draft
Owner: hebertpdl@gmail.com
Related: none — new requirement (changes how a workout is entered in
`docs/prds/client-workout-experience/prd.md`, §3.1 and R13–R20, R25, R30, R39–R42),
`docs/specs/client-workout-experience/spec.md`
Spec: not yet written (will be `docs/specs/workout-overview/spec.md`)
Design: design-ok — see §9

## 1. Summary

Today, starting a workout drops the client straight into its first exercise. With this change,
every way into a workout first opens an overview that lists all of the workout's exercises, so the
client sees the whole workout up front and chooses where to start. Picking an exercise opens the
existing exercise screen; everything from there (sets, rest, "Próximo", finishing, feedback) works
as it does today.

## 2. Actors

- **Client**: opens a workout's overview, picks an exercise to start or continue from, starts,
  continues or finishes the workout from the overview, and uses the workout actions there.
  - A client cannot reorder the exercises; the order is always the trainer's.
  - A client cannot mark an exercise as skipped.
- **Trainer**: not involved; nothing changes on the trainer side.

## 3. Flows

### 3.1 Client: start today's workout

1. On Início, the client taps "Ver treino" on today's workout card.
2. The workout overview opens, listing every exercise in the trainer's order with a summary of
   its sets.
3. The client taps "Começar treino" to start from the first exercise, or taps any exercise to
   start from that one.
4. The exercise screen opens for that exercise, and the session is now in progress.
5. The client trains as today. "Ver todos" or the back arrow returns to the overview, where each
   exercise shows its progress and the client can jump to another one.
6. When no exercise has sets left, the overview's main button reads "Finalizar treino"; finishing
   continues to the feedback step as today.

### 3.2 Client: continue a workout in progress

1. On Início, the client taps "Continuar treino".
2. The overview opens with each exercise's progress.
3. The client taps "Continuar treino" to go to the first exercise, in the trainer's order, that
   has sets left, or taps any exercise to go to it.

## 4. Rules

### 4.1 Entering a workout
- R1. Every way into a workout opens the overview first: "Ver treino" on Início, choosing a
  workout in the workout picker, and "Continuar treino" on Início.
- R2. On Início, the workout card's button that read "Começar treino" now reads "Ver treino".
- R3. On Início, the card of a workout in progress keeps the "Continuar treino" button.
- R4. Opening the overview does not start a session.
- R5. A session becomes in progress when the client opens an exercise from the overview.
- R6. Leaving the overview returns the client to Início.
- R7. Leaving the overview with a session in progress keeps the session in progress.

### 4.2 The overview
- R8. The overview lists every exercise of the workout in the trainer's order.
- R9. Each exercise row shows the exercise's position in the workout and its name.
- R10. Each exercise row shows a summary of its sets (for example "4 séries · 10–12 reps", or
  "3 × 45 s" for timed sets).
- R11. Each exercise row shows how many of its sets are ticked in the current session ("2 de 4").
- R12. An exercise row is marked done when all of its sets are ticked in the current session.
- R13. Each exercise row shows the exercise's thumbnail and its muscle groups.
- R14. Tapping an exercise row opens that exercise's screen.
- R15. Before any exercise is opened, the main button reads "Começar treino" and opens the first
  exercise.
- R16. With a session in progress, the main button reads "Continuar treino" and opens the first
  exercise, in the trainer's order, that has an unticked set.
- R17. With a session in progress and no unticked set left, the main button reads "Finalizar
  treino" and finishes the workout as today.
- R18. The overview has the workout actions menu ("Trocar treino", "Descartar treino"), with the
  same confirmations as today.

### 4.3 A workout already finished this week
- R19. The overview of a workout finished this week shows a "Concluído esta semana" note.
- R20. The overview of a workout finished this week shows no progress on its exercise rows.
- R21. The overview of a workout finished this week has the main button "Refazer treino".
- R22. The warning that finishing will replace the finished session appears when the client opens
  an exercise of a finished workout, from a row or from "Refazer treino".

### 4.4 Inside an exercise
- R23. "Ver todos" on the exercise screen returns to the overview.
- R24. The back arrow on the exercise screen returns to the overview.
- R25. The overview replaces the "Ver todos" sheet, including jumping to any exercise and
  "Finalizar treino".
- R26. Ticking an exercise's last set still moves on to the next exercise with an unticked set, as
  today.
- R27. "Próximo" on the exercise screen works as today.
- R28. The exercise screen keeps the workout actions menu ("Trocar treino", "Descartar treino").

## 5. Edge cases

| # | Scenario | Expected outcome | Rule |
|---|---|---|---|
| E1 | The client opens an exercise whose sets are all ticked. | It opens; its sets can be unticked or edited as today. | R14 |
| E2 | An exercise has no video. | Its row shows the placeholder thumbnail. | R13 |
| E3 | The phone is offline. | The overview works as the session does offline today. | R1 |
| E4 | The client opens the overview of a workout not started yet, then goes back. | Returns to Início; no session exists. | R4, R6 |
| E5 | The client opens the overview of a finished workout and goes back without opening an exercise. | Nothing changes; no warning appears and the finished session stays. | R4, R22 |
| E6 | The plan has several workouts today, or none. | The client picks one in the picker as today, then the overview opens. | R1 |
| E7 | The client ticks the last set of the last exercise with sets left. | No other exercise has sets left, so the exercise screen behaves as today (R40 of the client workout PRD); the overview's main button reads "Finalizar treino". | R17, R26 |

## 6. Out of scope

- The client reordering exercises: the order stays the trainer's.
- Marking an exercise as skipped: unticked sets simply stay pending.
- An estimated duration for the workout: not asked for.
- The read-only "Detalhe do Treino" reached from Planos: stays as it is.
- Any change on the trainer side or in the web app: not asked for.

## 7. Decisions

| Question | Decision | Why |
|---|---|---|
| Does resuming a workout also open the overview? | Yes, every entry opens it. | One consistent way into a workout. (proposed, accepted) |
| Is there a button to start without picking an exercise? | Yes, "Começar treino" / "Continuar treino" / "Finalizar treino" by progress. | Owner wanted a main button from the first exercise. |
| Início button copy | "Ver treino" | The button now opens the overview instead of starting. (proposed, accepted) |
| When does the session start? | When an exercise is opened. | Looking at the overview starts nothing. (proposed, accepted) |
| What happens to the "Ver todos" sheet? | Replaced by the overview; back and "Ver todos" return to it. | Avoids two lists of the same exercises. (proposed, accepted) |
| What does a finished workout's overview show? | "Concluído esta semana" note, no progress, "Refazer treino". | (proposed, accepted) |
| When does the redo warning appear? | When an exercise is opened. | Matches when a session begins. (proposed, accepted) |
| Where are the workout actions? | On the overview and on the exercise screen. | Nothing is lost on the exercise screen. (proposed, accepted) |
| What happens after an exercise's last set is ticked? | Unchanged: next exercise with sets left. | Keeps the flow fast during training. (proposed, accepted) |
| What happens after picking a workout in the picker? | The overview opens. | Same as every other entry. (proposed, accepted) |
| Edge cases E1–E3 | As listed. | Proposed defaults, accepted with the PRD. |

## 8. Open questions

None.

## 9. Design

pen.dev file `/Users/herbertlago/Documents/Vertice Web.pen`, read through the `pencil` MCP tools.

Screens are in row `Z0qzEO` **Mobile Row M — Aluno: Visão geral do treino** of frame `O3tUmW`
**Vertice — Mobile App**.

| Frame | Screen | Rules |
|---|---|---|
| `dri2T` | A - Visão geral do treino (Não iniciado) | R8–R15, E2 |
| `eJXmb` | A - Visão geral do treino (Em andamento) | R11, R12, R16 |
| `XnXD9` | A - Visão geral do treino (Todas as séries feitas) | R12, R17 |
| `RYbCh` | A - Visão geral do treino (Concluído esta semana) | R19–R21 |
| `Vj0aN` | A - Visão geral do treino (Refazer treino — aviso): the existing redo warning, shown on "Refazer treino" or a row tap; "Cancelar" stays on the overview | R22, E5 |

Changed existing screens:
- `A - Início` (`mVtAC`), `A - Início (Sem treino hoje)` (`mNzVn`) and `A - Início (Plano sem
  treinos)` (`jsmVN`): the card button reads "Ver treino" (R2).
- `A - Todos os Exercícios (Sheet)` (`qskC8`) is marked as replaced by the overview (R25).

New kit component in `Tskd4` **DS - Mobile Components**, row "Aluno Row — Visão geral do treino":
`M Exercise Overview Row` (`kdNLl`), with examples of its in-progress, done and no-video states.
