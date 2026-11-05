# TestFlight review fixes — implementation plan

Eight changes from the owner's TestFlight review of build 1.0.0 (1). Most are in the client (aluno)
workout experience; items 3 and 6 change `Screen`, `Sheet` and the root layout, so they reach every
trainer screen and the signed-out forms too. One branch and one PR each, every PR with its tests, reviewed by the
`pr-reviewer` agent and merged on green CI, then one TestFlight build (PR 9).

Rules that change are updated in `docs/prds/client-workout-experience/prd.md` by the PR that
changes them.

| Order | Item | Branch | Native rebuild |
| --- | --- | --- | --- |
| 1 | 2 — "Próximo exercício" always moves | `fix/next-exercise-always-moves` | no |
| 2 | 1 — last set moves on, no rest | `feat/last-set-advances` | no |
| 3 | 7 — week count in days | `fix/home-week-count-days` | no |
| 4 | 4 — stronger rest alert | `feat/stronger-rest-alert` | yes (notification sound) |
| 5 | 3 — keyboard "Concluir" bar | `feat/keyboard-done-toolbar` | yes (new native dep) |
| 6 | 6 — focused input stays visible | `fix/keyboard-aware-inputs` | no (after 3) |
| 7 | 8 — completion animations | `feat/completion-animations` | no |
| 8 | 5 — rest timer on the lock screen | `feat/rest-live-activity` | yes (widget target) |
| 9 | Release | `chore/release-1.1.0` | build + TestFlight |

A prerequisite PR (#65) aligns the Expo patch versions: newly published SDK 57 patches failed
`expo install --check` on every PR.

Item 2 goes first because item 1 reuses its "next open exercise" selector; items 3 and 6 share a
dependency, so 3 lands first.

## Item 2 — "Próximo exercício" always moves

**Cause.** The `next` action calls `firstOpenIndex`, the first exercise with an unticked set. While
the current exercise is unfinished that is usually the current one, so nothing moves.

**Plan.** New `nextOpenIndex(exercises, ticked, from)` in `engine.ts`: the first exercise *after*
`from` with an unticked set, wrapping to earlier skipped ones; `null` when no other exercise is
open. `next` uses it. Nothing is ticked, so the skipped exercise stays open in "Ver todos".

**Edge case.** When the current exercise is the only open one, there is nowhere to go, and a
"Próximo exercício" button would be the same dead tap as the bug. The button reads "Finalizar
treino" there, and the existing R43 confirmation states the pending sets.

**Tests.** Engine: moves from an unfinished exercise, skips done ones, wraps, stays when alone,
ticks nothing. Screen: the tap moves, the skipped exercise is still pending, the label on the only
open exercise. **PRD:** R39, R40, E20, flow 3.1 step 7.

## Item 1 — last set moves on, no rest

**Plan.** In the engine's `tick`: when the tick completes the exercise, start no rest and set
`exerciseIndex` to `nextOpenIndex`. With no open exercise left the index stays and nothing else
happens, so the button becomes "Finalizar treino" as today. This covers any set that completes the
exercise, and timed sets, which go through the same `tick`.

The screen scrolls back to the top when the exercise changes: `Screen`'s scroll offset otherwise
survives the change and the next exercise opens mid-page.

**Edge cases.** A hold can end behind a sheet about the exercise (video, progress, strategy): when
it moves on, the screen closes that sheet, or it would swap to the next exercise. Unticking and
re-ticking a set of a finished exercise counts as completing it again: it moves on, and replays
item 8's level 1.

**Tests.** Engine: completing an exercise gives no rest and moves; a skipped exercise is the
target; nothing moves on the last one; a timed set behaves the same; a non-final set still rests.
Screen: no timer and no notification after the last set; a hold moving on closes its sheet.
**PRD:** new R46a, R45, R48, R53, E23, E26, flow 3.1 steps 4–6.

## Item 7 — week count in days

**Cause.** `finishedCount` counts distinct plan workouts finished, while the week strip above it
counts days. Two workouts on one day read as 2 next to one done day.

**Plan.** Count the `done` days of `clientWeek`, the same source as the strip, so the two can't
disagree. The total is `max(the plan's distinct training days, days trained)`, so it never reads
"6 de 5". Copy: "2 de 5 dias de treino concluídos"; keeping
"treinos" would be wrong once the number is days. `finishedCount` is removed. The trainer's
"Esta semana" stat comes from the BFF and is out of scope.

**Redos.** A finished redo supersedes the earlier session, which leaves the week list (R22), so
Monday's workout redone on Wednesday shows and counts Wednesday only. Keeping Monday would need an
API contract change and a PRD decision: out of scope here, raised with the owner.

**Tests.** `clientWeek`: two workouts in a day count once, a redo counts its own day only, an extra
day raises the total, two workouts sharing a weekday count one training day. Screen: the copy.
**PRD:** R6.

## Item 4 — stronger rest alert

**Cause.** The in-app alert is one `Haptics.notificationAsync(Success)`, a light tap, and a 0.4 s
chime.

**Plan.**
- Vibration through RN `Vibration`, three pulses, never `repeat` (that buzzes until cancelled), one
  array per platform: iOS pulses are a fixed 400 ms of the full vibration motor and the array only
  sets the gaps; Android reads wait/vibrate times. `android.permission.VIBRATE` already comes from
  `expo-haptics`.
- A new, longer and louder chime, generated for this app. It still respects the silent switch
  (`playsInSilentMode: false`): the review asks for sound only when sound is on.
- The background notification uses the same sound (`expo-notifications` `sounds`), on an Android
  `rest-timer` channel with high importance and the vibration pattern. The file is `rest_done.wav`:
  a hyphen is invalid in an Android resource name and fails the prebuild.

**Tests.** The alert vibrates with the pattern, without repeat, and plays the chime; the
notification carries the sound and channel; the sound is bundled by app.json under a valid Android
name; the channel is created on Android only. **PRD:** R49.

## Item 3 — keyboard "Concluir" bar

**Plan.** Add `react-native-keyboard-controller` (the version Expo SDK 57 bundles), with
`KeyboardProvider` in the root layout, and a kit `KeyboardBar` wrapping `KeyboardToolbar` with
previous/next and "Concluir", themed from tokens. It renders once at the root and once in
`SheetModal`, because a `Modal` draws over the root.

Core `InputAccessoryView` was rejected: it needs wiring per input and is unreliable with several
inputs sharing one bar. The library also solves item 6, and it works the same on Android.

**Layout.** The toolbar is absolutely positioned on top of the keyboard, exactly where the
`KeyboardAvoidingView` puts a footer, so on its own it would cover "Enviar feedback" and every save
bar. `Screen` and `SheetModal` get a `keyboardVerticalOffset` of the bar's height, so footers clear
it from this PR on.

**Tests.** The bar renders with the label; the sheet renders its own; the offset is applied.
Simulator check on a numeric pad, a multi-line field, a field inside a sheet, a trainer form with a
footer and a trainer sheet form.

## Item 6 — focused input stays visible

**Cause.** `KeyboardAvoidingView` shrinks the screen, but nothing scrolls to the focused field, and
on the feedback screen the two footer buttons take the remaining space.

**Plan.** `Screen` and `Sheet` scroll with `KeyboardAwareScrollView`, which covers every field and a
multi-line field as it grows. Its default mode adds the keyboard's height as bottom space, so inside
a frame a `KeyboardAvoidingView` already shrank it would compensate twice. Scrolling screens and
sheets therefore drop the RN `KeyboardAvoidingView`, and the footer moves to a `KeyboardStickyView`
opened by the bar's height. `scroll={false}` screens keep theirs. `bottomOffset` is the bar's height
plus the footer's measured height plus a gap, so a field can't settle behind the footer. Check that
pull to refresh still works on `Screen`.

**Tests.** `Screen` renders the aware scroll view with the offset and keeps `refreshControl`.
Simulator check on the feedback screen, a trainer form with a footer and a trainer sheet form.

## Item 8 — completion animations

**Plan.** Both built on `react-native-reanimated` and `react-native-svg`, already in the app.
- **Level 1, exercise done:** a check drawn inside a ring at the centre of the screen, in `success`,
  with a soft expanding ring and a light haptic. Under a second, `pointerEvents="none"`, so it never
  blocks the next set.
- **Level 2, workout done:** full screen, only after a feedback is sent (not on "Pular"), online or
  queued offline. The Vertice mark's colours: a burst of `primary` and `success` sparks around a
  drawn trophy disc, "Treino concluído!" and a success haptic. It goes home when it ends, or on tap,
  and the existing toast still shows there (a queued client needs "será enviado quando a conexão
  voltar").
- Reduce Motion: a plain fade, no burst. Hidden from the accessibility tree with an announcement
  instead.

**Tests.** Level 1 fires each time an exercise is completed (a re-tick included, item 1) and not on
a restored session or a non-final set. Level 2 shows after sending and not after skipping, and goes
home when done with its toast. Reduce Motion path. **PRD:** a new rule for the two levels, flow 3.1
step 9.

## Item 5 — rest timer on the lock screen

**iOS.** A Live Activity through `expo-widgets` (`~57.0.x`, bundled) and `@expo/ui`: lock screen
banner and Dynamic Island with the system's own countdown, which keeps running with the app
suspended. Started when a rest starts (the app is in the foreground then), replaced by the next
rest, ended when the rest is cancelled or ends with the app open. No push needed.

The main case is a locked phone, where JS doesn't run when the rest ends. So the activity starts
with `staleDate = rest.endsAt` and its layout shows "Descanso terminou" from `isStale`, without the
app. On launch and on foreground, any leftover activity whose rest is over is ended.

**Android.** A local module posting an ongoing notification with a chronometer countdown, on its
own low-importance silent channel (item 4's channel would sound at every rest start). It shows on
the lock screen and dismisses itself at the end of the rest. Returning to the app today runs
`dismissAllNotificationsAsync`, which would remove it mid-rest, so that becomes dismissing only the
delivered rest notification. The countdown stays visible while the app is open: hiding it would
need reposting it on every background change.

**Notifications denied.** iOS keeps a separate Settings toggle for Live Activities, so a client who
denied notifications still gets the countdown; it's an on-screen display, not an alert, so that's
accepted. Android needs the notification permission, so that client gets none there.

**Risk.** The widget is a new signed target, with a new bundle id and provisioning profile, and the
plugin adds an App Group to the main app's entitlements, so its profile changes too. That needs
Apple credentials once, possibly interactively by the owner. A failure to start an activity
(unsupported, or disabled in Settings) is silent, and never blocks the rest.

**Tests.** The hook starts, replaces and ends the activity with the rest, passes the stale date,
ends a leftover activity on foreground and tolerates a failure. The foreground dismissal leaves the
countdown alone. **PRD:** a new rule for the lock-screen countdown; R50, R51 per platform.

## PR 9 — release

Bump `version` to 1.1.0, since 1.0.0 is in App Review, then `eas build --platform ios --profile
production` and `eas submit` to TestFlight. The build number comes from EAS (`autoIncrement`).

## Checks on every PR

CI (`api:types --check`, `tokens:check`, `routes:types`, `typecheck`, `lint --max-warnings 0`,
`npm test`, `test:hostile-tz`, `expo install --check`, `expo-doctor`) green on the latest commit,
and `pr-reviewer` approval, before merging.

## PR log

| Item | PR | Status |
| --- | --- | --- |
