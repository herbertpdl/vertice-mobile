# PRD: Client workout experience (mobile)

Status: Draft
Owner: hebertpdl@gmail.com
Related: `vertice-api/docs/requirements.md` (source requirements, client part: "Access their
training plans on the app whenever they want", "They cannot change enything on the training plan",
"They should be able to mark a workout as completed", "They should be able to provide feedback
about a workout every time they finish one", "When doing the workout, they need to be able to
record the weight they used for every set on every excercise, and when accessing the same workout
on the next time, it should be there for them to remember", "The excercise should also render a
video in the ap for the client to see how to execute the exercise", "the client should be able to
see which wourkout is already done for that week", "show graph with the progress of the weight
during the weeks"), `docs/specs/mobile-app/spec.md` (§1 lists the client experience as the
follow-up this PRD defines), `vertice-api/docs/specs/workout-session-logging/spec.md`,
`vertice-api/docs/specs/workout-feedback/spec.md`, `vertice-api/docs/specs/exercise-progress/spec.md`
Spec: `docs/specs/client-workout-experience/spec.md`
Design: pen.dev file `Vertice Web.pen` — see §10

## 1. Summary

Today the mobile app serves only trainers; a client who signs in sees an "app do aluno em breve"
notice. This feature gives the client their own app: a home that shows the training plan they are
on now and a single button to start training, a guided workout screen that takes them through one
exercise at a time (next, next, finish) with set ticking, weight recording and a rest timer, and a
feedback step at the end that reaches their trainer. It turns the plans trainers build into
something clients actually train with, and gives trainers the session data and feedback the
product promises them.

## 2. Actors

**Client** (a person a trainer has given access to the app)
- Can see all training plans assigned to them, train on the active one, record the weight used
  per set, finish a workout, give feedback, watch exercise videos, see their weight progress per
  exercise, see their trainer's contact details the trainer chose to show, and manage their own
  account.
- Cannot change anything in a training plan, workout, exercise or set.
- Cannot train on a plan that is not active (an upcoming or ended plan is view-only).
- Cannot record reps; only weight.
- Cannot change the rest time, skip it with a button, or add time to it.
- Cannot give feedback after leaving the finish step.
- Cannot see anything belonging to other clients.

**Trainer**
- Receives every finished session's weights and feedback (emoji and text) for their clients.
- Chooses which of their contacts (e-mail, WhatsApp, Instagram) their clients see.
- Can only attach YouTube videos to exercises.

## 3. Flows

### 3.1 Client: train today's workout

1. The client opens the app and lands on **Início**: the active plan card, this week's Mon–Sun
   strip and "Começar treino".
2. They tap "Começar treino". The app opens today's workout of the active plan (for example,
   Monday's workout on a Monday).
3. The workout screen shows the first exercise: its name, the trainer's description, "Ver
   execução", and its sets with the prescribed values and a weight field.
4. They do a set, adjust the weight if needed, and tick it. The rest timer starts.
5. When the rest ends, the app alerts them; they do the next set. Repeat.
6. When the exercise's sets are done, they tap "Próximo" and the next exercise opens.
7. After the last exercise, "Próximo" becomes "Finalizar treino". They tap it.
8. The feedback step opens: they pick one of five emojis, optionally write a comment, and send it
   (or skip).
9. They return to Início, where today's day is marked done in the week strip.

### 3.2 Client: no workout today

1. The client taps "Começar treino" on a day the active plan has no workout.
2. A picker lists the plan's workouts with their weekday and whether each is done this week.
3. They pick one; the workout screen opens on it and the flow continues as in 3.1 step 3.

### 3.3 Client: switch to another day's workout

1. On the workout screen, the client taps "Trocar treino".
2. The picker from 3.2 opens. They pick another workout.
3. If they had ticked anything in the current session, they confirm that the current session will
   be discarded; the chosen workout opens.

### 3.4 Client: browse plans, progress and trainer

1. **Planos** lists the active plan first, then upcoming plans, then ended plans.
2. Opening a plan shows its workouts by weekday; opening a workout shows its exercises and sets,
   read-only. Each exercise offers "Ver execução" and "Ver progresso".
3. **Perfil** shows their trainer's name and the contacts the trainer chose to show, and their own
   account options.

### 3.5 Trainer: choose contacts shown to clients

1. In their profile edit (mobile and web), the trainer fills in WhatsApp and Instagram, next to the
   e-mail they already have.
2. Each of e-mail, WhatsApp and Instagram has a "mostrar aos alunos" switch.
3. Their clients see the name plus every contact switched on and filled in.

## 4. Rules

### 4.1 Home and plans
- R1. A client's active plan is the plan assigned to them whose start and end dates include today.
- R2. When more than one plan includes today, the active plan is the one with the latest start date.
- R3. When no plan includes today, Início shows an empty state saying their trainer has no plan
  running for them right now, with a link to Planos.
- R4. "Today" and "this week" follow the calendar in Brazil (São Paulo time); a week runs Monday to
  Sunday.
- R5. Início shows only the active plan card (name, level, period), the week strip, the main
  button and a "Ver outros planos" link to Planos.
- R6. The week strip marks each day as done (the client finished a workout on that date, whichever
  weekday the workout belongs to — Monday's workout done on Friday marks Friday), today, pending
  (a workout exists, nothing finished that day), or rest (no workout that weekday).
- R7. When the active plan has no workouts, "Começar treino" is disabled and a message says the
  trainer has not added workouts yet.
- R8. When a session is in progress this week, the main button reads "Continuar treino" and opens
  that session where the client stopped.
- R9. The app has three tabs: Início, Planos, Perfil.
- R10. Planos lists every plan assigned to the client: active first, then upcoming (soonest first),
  then ended (most recent first).
- R11. A client can open any plan, its workouts and their exercises and sets, read-only.
- R12. A client can start a workout only from the active plan.

### 4.2 Starting, switching and redoing
- R13. "Começar treino" opens the active plan's workout for today's weekday.
- R14. When the active plan has more than one workout for today's weekday, the client picks one of
  them in the picker before the workout opens.
- R15. When the active plan has no workout for today's weekday, the client picks any of the plan's
  workouts in the picker.
- R16. The picker shows each workout's name, weekday, number of exercises, and whether it is done
  this week.
- R17. A workout with no exercises cannot be started; the picker shows it as unavailable.
- R18. On the workout screen, "Trocar treino" opens the picker to choose another workout.
- R19. Switching workouts while the current session has at least one ticked set asks for
  confirmation and then discards the current session.
- R20. A client can start again a workout already finished this week, after a warning that
  finishing the new session will replace the finished one.
- R21. When a client starts a workout already finished this week, the finished session (weights
  and feedback) stays as it is until the new session is finished.
- R22. When the new session is finished, it replaces the earlier one as that workout's session for
  the week.
- R23. When a new session that would replace a finished one is discarded, the finished one stays.
- R24. When a session is replaced, feedback the trainer already received from it stays visible to
  the trainer, marked as coming from a replaced session.
- R25. When the client leaves a workout before finishing (back button, app closed, phone off), the
  session stays in progress with everything ticked and recorded.
- R26. A client can discard an in-progress session, after confirmation; nothing from it is kept.
- R27. When the week ends, an in-progress session with at least one ticked set is finished
  automatically with what was ticked, with no feedback.
- R28. When the week ends, an in-progress session with no ticked set is discarded.
- R29. A client finishes a session on the version of the workout they started; trainer changes made
  meanwhile apply from the next session.

### 4.3 Workout screen
- R30. The workout screen shows one exercise at a time, with the workout name and progress
  ("Exercício 2 de 6").
- R31. Each exercise shows its name, the trainer's description, and its sets in order.
- R32. Each set shows its number, the prescribed reps or duration, the trainer's prescribed weight
  or load percentage when set, its strategy, and the trainer's set notes when set.
- R33. Each set has a weight field in kilograms that accepts 0 to 999 with up to two decimals.
- R34. The weight field is optional; a set can be ticked with it empty.
- R35. The weight field starts with the weight the client recorded for that same set the last time
  they finished that workout.
- R36. When the client never recorded that set, the weight field starts with the trainer's
  prescribed weight, or empty when there is none.
- R37. When a last-time weight exists, it is also shown next to the set as a hint ("Última vez:
  20 kg").
- R38. A client can untick a set and edit its weight until the session is finished.
- R39. "Próximo" moves to the first exercise, in the trainer's order, that still has an unticked
  set.
- R40. When every set is ticked, "Próximo" becomes "Finalizar treino".
- R41. "Ver todos" lists every exercise of the workout with how many of its sets are ticked, and
  lets the client jump to any of them.
- R42. "Finalizar treino" is always reachable from "Ver todos", even with unticked sets.
- R43. Finishing with unticked sets asks for confirmation, stating how many sets are not done.
- R44. A finished session marks the workout done for the week; unticked sets are not recorded.

### 4.4 Rest and timed sets
- R45. Ticking a set starts a rest countdown of the rest time the trainer set for that set.
- R46. When the set's rest time is zero, no countdown starts.
- R47. The client cannot pause, skip, shorten or lengthen the countdown.
- R48. Ticking another set, or moving to another exercise, ends the running countdown (and starts
  the newly ticked set's rest, per R45).
- R49. When the countdown ends while the app is open, the phone vibrates and plays a sound.
- R50. When the countdown ends while the app is in the background or the phone is locked, the
  client gets a phone notification saying the rest is over.
- R51. When the client has not allowed notifications, only the in-app alert happens.
- R52. A set prescribed by duration (a timed hold) has an "Iniciar" button that counts down the
  prescribed duration.
- R53. When a hold countdown ends, the set is ticked and its rest countdown starts.
- R54. A timed set can also be ticked by hand without using "Iniciar".

### 4.5 Offline
- R55. Opening a workout for the first time in a session needs a connection.
- R56. Once a workout is open, ticking, unticking, recording weights, the rest timer and finishing
  keep working without a connection.
- R57. While offline, the workout screen shows a banner saying the workout will be sent when the
  connection returns.
- R58. Everything done offline is sent automatically when the connection returns, without the
  client doing anything.

### 4.6 Exercise video and progress
- R59. When an exercise has a video, "Ver execução" plays it inside the app, in a sheet over the
  workout.
- R60. A running rest countdown keeps running while the video is open.
- R61. Only YouTube videos are supported; a trainer cannot save an exercise video link that is not
  YouTube.
- R62. An existing non-YouTube video link is not shown to clients.
- R63. "Ver progresso" shows a chart of the heaviest weight the client recorded for that exercise in
  each week, counting finished sessions only.
- R64. "Ver progresso" is available from the exercise on the workout screen and from the exercise in
  a plan's read-only view.

### 4.7 Feedback
- R65. After a session is finished by the client, the feedback step opens.
- R66. The feedback step offers five ratings, each a custom emoji illustration: Muito difícil,
  Difícil, Na medida, Fácil, Muito fácil.
- R67. Sending feedback requires a rating.
- R68. A comment is optional and holds up to 2,000 characters.
- R69. The client can skip the feedback step with "Pular".
- R70. Feedback can only be given in the feedback step right after finishing; a skipped session has
  no feedback.
- R71. The trainer sees the rating emoji next to the feedback everywhere feedback appears today, in
  the trainer mobile app and on the web.
- R72. Feedback with a rating and no comment shows the rating alone to the trainer.

### 4.8 Profile and trainer contact
- R73. Perfil shows the client's name and e-mail, change password, terms and privacy, export my
  data, delete account, and sign out.
- R74. Perfil shows "Seu treinador" with the trainer's name.
- R75. Under the trainer's name, the client sees each of the trainer's e-mail, WhatsApp and
  Instagram that the trainer filled in and chose to show.
- R76. Tapping e-mail opens the mail app, WhatsApp opens a WhatsApp chat, Instagram opens the
  trainer's Instagram profile.
- R77. A trainer can add a WhatsApp number and an Instagram profile to their profile, on mobile and
  web.
- R78. A trainer can switch "mostrar aos alunos" on or off for each of e-mail, WhatsApp and
  Instagram.
- R79. The trainer's name is always shown to their clients.

## 5. Edge cases

| # | Scenario | Expected outcome | Rule |
|---|---|---|---|
| E1 | Two plans include today | The one with the latest start date is active; the other is in Planos | R2 |
| E2 | No plan includes today (between plans, or none assigned yet) | Empty state on Início with a link to Planos | R3 |
| E3 | Active plan has no workouts | "Começar treino" disabled with a message | R7 |
| E4 | Active plan has two workouts for Monday, it's Monday | Picker shows those two | R14 |
| E5 | It's Sunday and the plan has no Sunday workout | Picker with all workouts | R15 |
| E6 | A workout has no exercises | Shown as unavailable in the picker | R17 |
| E7 | Monday's workout already finished; client starts it again on Monday | Warning; new session starts; old one kept until the new one is finished | R20–R22 |
| E8 | Client redoes Monday's workout, then discards the redo | Original finished session and its feedback stay | R23 |
| E9 | Replaced session had feedback | Trainer still sees it, marked as from a replaced session | R24 |
| E10 | Client closes the app mid-workout and returns next day | "Continuar treino" opens it where they stopped | R8, R25 |
| E11 | Client switches to Tuesday's workout with sets ticked on Monday's | Confirm, Monday's session discarded | R19 |
| E12 | Client switches with nothing ticked yet | Switches with no confirmation | R19 |
| E13 | Week ends with a session in progress, 3 sets ticked | Finished automatically, no feedback | R27 |
| E14 | Week ends with a session started but nothing ticked | Discarded | R28 |
| E15 | Trainer removes an exercise while the client is mid-workout | Client keeps the version they started; change applies next session | R29 |
| E16 | Bodyweight exercise, client ticks with no weight | Allowed; nothing recorded as weight | R34 |
| E17 | Client never did this workout and trainer prescribed 20 kg | Field starts at 20 | R36 |
| E18 | Client never did it and trainer prescribed nothing | Field starts empty | R36 |
| E19 | Client typed the wrong weight on a ticked set | Edits it (or unticks) before finishing | R38 |
| E20 | Client picks exercise 4 out of order, then taps "Próximo" | Goes to the first exercise (in trainer order) with unticked sets, e.g. 1 | R39 |
| E21 | Client finishes with 4 sets unticked | Confirm "4 séries não concluídas"; finishing records only the ticked sets | R43, R44 |
| E22 | Set has 0 s rest | No countdown | R46 |
| E23 | Client ticks the next set during rest | Current countdown ends, the new set's rest starts | R48 |
| E24 | Rest ends while the phone is locked | Notification | R50 |
| E25 | Client denied notifications | In-app alert only | R51 |
| E26 | Timed hold of 30 s | "Iniciar" counts down; set ticks itself; rest starts | R52, R53 |
| E27 | Connection drops mid-workout | Training continues; banner; sent on reconnect | R56–R58 |
| E28 | Client has no connection when opening a workout they never opened | Cannot open it; offline message | R55 |
| E29 | Client opens the video during rest | Countdown keeps running and alerts when over | R60 |
| E30 | Exercise has a non-YouTube link saved before this change | No "Ver execução" for the client | R62 |
| E31 | Exercise never done, client opens "Ver progresso" | Empty chart state | R63 |
| E32 | Client tries to send feedback with only a comment | "Enviar" stays disabled until a rating is picked | R67 |
| E33 | Client skips feedback | Session has no feedback; it can't be added later | R70 |
| E34 | Session auto-finished at week end | No feedback prompt | R27 |
| E35 | Trainer shows WhatsApp but left it empty | Not shown to clients | R75 |
| E36 | Trainer hides every contact | Clients see only the trainer's name | R79 |
| E37 | Client opens an ended plan | Read-only view; no start button | R11, R12 |

## 6. Out of scope

- A session history list (past sessions with dates and weights): not wanted for now.
- Recording reps actually done: weight only.
- Pausing, skipping or adjusting the rest countdown.
- Giving feedback after leaving the finish step.
- Video uploads: planned later; they will play in the same in-app player.
- Non-YouTube video links.
- In-app chat with the trainer.
- Notifications sent by the trainer or by the server (only the on-device rest alert).
- Weight in pounds.
- Training on an upcoming or ended plan.

## 7. Decisions

| Question | Decision | Why |
|---|---|---|
| Which plan is "active" when several are assigned | The one whose dates include today; latest start wins on overlap | (proposed, accepted) dates already describe when a plan runs |
| Does home show week progress | Yes, a Mon–Sun strip, plus a link to other plans | Requirement "see which workout is already done for that week"; owner asked for the plans link |
| Redoing a workout finished this week | Allowed with a warning; replaces the earlier session | Owner: start again, warn that it overrides; today one session per workout per week |
| When the replacement happens | Only when the new session is finished | (proposed, accepted) a discarded redo shouldn't destroy finished work |
| Leaving mid-workout | Resume where stopped, discard available | (proposed, accepted) |
| Switching workouts mid-session | Discards the current session | Owner's choice over keeping both in progress |
| Weight pre-fill | Last time's weight, else trainer's, else empty | (proposed, accepted) requirement "it should be there for them to remember" |
| Recording reps | No | Owner: weight only |
| Rest countdown controls | None; ticking another set ends it | Owner: fixed timer; early tick (proposed, accepted) |
| Finishing with unticked sets | Allowed after confirmation | (proposed, accepted) |
| Feedback form | 5 custom emoji ratings (very hard → very easy) required, optional text | Owner: emoji scale from angry to relaxing |
| Feedback later | Not possible; only at finish | Owner |
| Unfinished session at week end | Auto-finished if anything ticked, else discarded | Owner chose auto-finish; empty case (proposed, accepted) |
| Trainer edits mid-session | Client finishes the version they started | (proposed, accepted) |
| Offline | Keep training, send when back | (proposed, accepted) gyms often have bad signal |
| Video links | YouTube only, played in-app | Owner: one in-app player, uploads later |
| Trainer contacts | Name always; e-mail, WhatsApp, Instagram each optional and trainer-controlled | Owner |
| Trainer-side changes in this PRD | Yes: rating display, contact fields, YouTube-only links | Owner |
| Navigation | Tabs Início, Planos, Perfil | Owner |
| "Today" | Brazil calendar day, week Monday–Sunday | (proposed, accepted) matches the rest of the product |
| Several workouts on today's weekday | Client picks one | (proposed, accepted) |
| Progress chart entry points | Workout screen and plan view | (proposed, accepted) |
| Contacts' starting state | Hidden until the trainer switches each one on | (proposed, accepted) privacy by default |
| Trainer deletes a set during a client's session | The client still sees and can tick it, but that set's weight is not kept | (proposed, accepted) rare case; keeping it needs much more work |
| Unfinished redo when the week ends | Finished automatically and replaces the earlier finished session | (proposed, accepted) an automatic finish counts as a finish |
| Word for the person training | "client" (pt-BR UI: "aluno") | Product already uses it |

## 8. Open questions

None.

## 9. Technical constraints (stated by the owner)

- "the design is still not created and should be part of this PRD and should be made in the
  pen.dev file related to the project" — the designs in §10 live in the project's pen.dev file
  (`/Users/herbertlago/Documents/Vertice Web.pen`) and are the design source for the spec.

## 10. Design

pen.dev file `/Users/herbertlago/Documents/Vertice Web.pen`, read through the `pencil` MCP tools.

Screens are in frame `O3tUmW` **Vertice — Mobile App**. Client screens are prefixed `A - ` and
trainer screens `M - `. New kit components are in `Tskd4` **DS - Mobile Components**.

### 10.1 Client screens

| Row | Frame | Screen | Rules |
|---|---|---|---|
| H `QQgqD` | `mVtAC` | A - Início | R1, R5, R6, R13 |
| | `AeMud` | A - Início (Treino em andamento) | R8, R26 |
| | `p1coh` | A - Início (Treino de hoje concluído) | R6, R20 |
| | `mNzVn` | A - Início (Sem treino hoje) | R15 |
| | `Z1jxfC` | A - Início (Sem plano ativo) | R3 |
| | `jsmVN` | A - Início (Plano sem treinos) | R7 |
| I `M2KwN` | `uJHG8` | A - Escolher Treino (Sheet) | R14–R17, R20 |
| | `J7lff0` | A - Treino (Exercício) | R30–R39, R41 |
| | `HSlcu` | A - Treino (Descanso) | R45–R48 |
| | `Ehxuh` | A - Treino (Isometria) | R52–R54 |
| | `WuQUK` | A - Treino (Último exercício) | R40 |
| | `vL3cB` | A - Treino (Offline) | R56–R58 |
| J `vh3iN` | `qskC8` | A - Todos os Exercícios (Sheet) | R41, R42 |
| | `a4aH7F` | A - Ações do Treino (Action Sheet): Trocar / Descartar | R18, R26 |
| | `KA0dH` | A - Finalizar com séries pendentes (Confirm) | R43 |
| | `w9E18` | A - Trocar treino (Confirm) | R19 |
| | `TQpim` | A - Refazer treino concluído (Confirm) | R20–R23 |
| | `C7nYt` | A - Descartar treino (Confirm) | R26 |
| | `DlKX6` | A - Ver Execução (Sheet), YouTube in-app, rest still counting | R59, R60 |
| | `Lnp7p` | A - Progresso do Exercício (Sheet) | R63 |
| | `F1TnxQ` | A - Descanso terminou (Notificação) | R50 |
| K `lADfU` | `Z5VFj8` | A - Feedback do Treino (no rating yet, Enviar disabled) | R65–R69 |
| | `Q9F3s` | A - Feedback do Treino (Preenchido) | R66–R68 |
| | `TJLLJ` | A - Planos | R9, R10 |
| | `G4tdAR` | A - Detalhe do Plano (Encerrado), read-only | R11, R12 |
| | `YT9QM` | A - Detalhe do Treino (Leitura) | R11, R64 |
| | `UkVWg` | A - Perfil with "Seu treinador" | R73–R76 |

### 10.2 Trainer screens

| Row | Frame | Screen | Rules |
|---|---|---|---|
| L `u5u7E` | `Ls7a6` | M - Editar Perfil (Contatos para alunos) | R77–R79 |
| | `Ctbzl` | M - Novo Exercício (Vídeo não é do YouTube) | R61 |
| | `goaCq` | M - Feedbacks (com avaliação), incl. no-comment and replaced-session rows | R24, R71, R72 |

The design also updates two existing trainer pieces:
- `M Feedback Row` (`Yg7CH`) now carries a rating chip, so every trainer screen that lists
  feedback shows the rating.
- The video field help on `M - Novo Exercício` now reads "Cole um link do YouTube".

### 10.3 New kit components (`Tskd4`)

- Navigation and week: `M Tab Bar Aluno` (`u7l9GT`, tabs Início / Planos / Perfil), `M Week Day`
  (`oPKy0`) with its Done / Today / Rest variants, and `M Week Strip` (`K1kwAJ`).
- Workout: `M Workout Set` (`bcq0b`) with its Done (`BL2gB`), Current (`kX8Zq`), Timed
  (`UR1PP`) and Holding (`Yas9W`) variants; `M Rest Timer` (`VET5R`); `M Exercise Step Row`
  (`A5U95x`) with its Done / Current variants; `M Workout Pick Row` (`uKGLm`) with its Done /
  Today / Unavailable variants.
- Controls: `M Switch` (`mxJuO`) and `M Switch Off` (`GxxUW`).
- Rating: `M Emoji <rating>` at 48 px (five custom illustrations: `v4TLU`, `Id7HN`, `o2Xiz5`,
  `m1G0ro`, `IRCH2`) and their 20 px copies; `M Rating Option` (`Io7zL`) and its Selected variant
  (`UY0fd`); `M Rating Scale` (`CtsNy`); `M Rating Chip` (`Yjc55`).

### 10.4 Not yet designed

- The web (vertice-web-react) versions of R61, R71–R72 and R77–R78. They follow the mobile
  trainer designs above and still need frames in the web screens (`SSME3`).
- An empty "Ver progresso" chart (E31). Reuse the trainer's `M - Detalhe do Aluno (Progresso
  Vazio)` pattern (`xOna1`).
