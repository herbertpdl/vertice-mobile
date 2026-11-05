# TestFlight review fixes — implementation plan

Eight changes from the owner's TestFlight review of build 1.0.0 (1), all in the client (aluno)
workout experience. One branch and one PR each, every PR with its tests, reviewed by the
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
open exercise. **PRD:** R39, R40, E20.

## Item 1 — last set moves on, no rest

**Plan.** In the engine's `tick`: when the tick completes the exercise, start no rest and set
`exerciseIndex` to `nextOpenIndex`. With no open exercise left the index stays and nothing else
happens, so the button becomes "Finalizar treino" as today. This covers any set that completes the
exercise, and timed sets, which go through the same `tick`.

The screen scrolls back to the top when the exercise changes: `Screen`'s scroll offset otherwise
survives the change and the next exercise opens mid-page.

**Tests.** Engine: completing an exercise gives no rest and moves; a skipped exercise is the
target; nothing moves on the last one; a timed set behaves the same; a non-final set still rests.
Screen: no timer and no notification after the last set. **PRD:** R45, R46.

## Item 7 — week count in days

**Cause.** `finishedCount` counts distinct plan workouts finished, while the week strip above it
counts days. Two workouts on one day read as 2; a redo on another day reads as 1.

**Plan.** Count the `done` days of `clientWeek`, the same source as the strip, so the two can't
disagree. The total is the plan's distinct training days. A client who trains on an extra day would
read "6 de 5", so the total grows with the count. Copy: "2 de 5 dias de treino concluídos"; keeping
"treinos" would be wrong once the number is days. `finishedCount` is removed. The trainer's
"Esta semana" stat comes from the BFF and is out of scope.

**Tests.** `clientWeek`: two workouts in a day count once, a redo on another day counts twice, an
extra day raises the total, two workouts sharing a weekday count one training day. Screen: the copy.

## Item 4 — stronger rest alert

**Cause.** The in-app alert is one `Haptics.notificationAsync(Success)`, a light tap, and a 0.4 s
chime.

**Plan.**
- Vibration through RN `Vibration` with a repeating pattern (three long pulses): the full vibration
  motor on iOS, not the Taptic tap. `android.permission.VIBRATE` already comes from `expo-haptics`.
- A new, longer and louder chime, generated for this app. It still respects the silent switch
  (`playsInSilentMode: false`), as the owner asked: sound only when sound is on.
- The background notification uses the same sound (`expo-notifications` `sounds`), on an Android
  `rest-timer` channel with high importance and the vibration pattern.

**Tests.** The alert vibrates with the pattern and plays the chime; the notification carries the
sound and channel; the channel is created on Android only.

## Item 3 — keyboard "Concluir" bar

**Plan.** Add `react-native-keyboard-controller` (the version Expo SDK 57 bundles), with
`KeyboardProvider` in the root layout, and a kit `KeyboardBar` wrapping `KeyboardToolbar` with
previous/next and "Concluir", themed from tokens. It renders once at the root and once in
`SheetModal`, because a `Modal` draws over the root.

Core `InputAccessoryView` was rejected: it needs wiring per input and is unreliable with several
inputs sharing one bar. The library also solves item 6, and it works the same on Android.

**Tests.** The bar renders with the label; the sheet renders its own. Simulator check on a numeric
pad, a multi-line field and a field inside a sheet.

## Item 6 — focused input stays visible

**Cause.** `KeyboardAvoidingView` shrinks the screen, but nothing scrolls to the focused field, and
on the feedback screen the two footer buttons take the remaining space.

**Plan.** `Screen` and `Sheet` scroll with `KeyboardAwareScrollView`, with a `bottomOffset` clearing
the bar, so it covers every field and a multi-line field as it grows. The footer stays above the
keyboard. Check that pull to refresh still works on `Screen`.

**Tests.** `Screen` renders the aware scroll view with the offset and keeps `refreshControl`.
Simulator check on the feedback screen.

## Item 8 — completion animations

**Plan.** Both built on `react-native-reanimated` and `react-native-svg`, already in the app.
- **Level 1, exercise done:** a check drawn inside a ring at the centre of the screen, in `success`,
  with a soft expanding ring and a light haptic. Under a second, `pointerEvents="none"`, so it never
  blocks the next set.
- **Level 2, workout done:** full screen, only after a feedback is sent (not on "Pular"), online or
  queued offline. The Vertice mark's colours: a burst of `primary` and `success` sparks around a
  drawn trophy disc, "Treino concluído!" and a success haptic. It goes home when it ends, or on tap.
- Reduce Motion: a plain fade, no burst. Hidden from the accessibility tree with an announcement
  instead.

**Tests.** Level 1 fires once per exercise completed and not on a restored session or a non-final
set. Level 2 shows after sending and not after skipping, and goes home when done. Reduce Motion path.

## Item 5 — rest timer on the lock screen

**iOS.** A Live Activity through `expo-widgets` (`~57.0.x`, bundled) and `@expo/ui`: lock screen
banner and Dynamic Island with the system's own countdown, which keeps running with the app
suspended. Started when a rest starts (the app is in the foreground then), replaced by the next
rest, ended when the rest ends, is cancelled, or the app returns after it finished. No push needed.

**Android.** A local module posting an ongoing notification with a chronometer countdown, which
shows on the lock screen and dismisses itself at the end of the rest.

**Risk.** The widget is a new signed target: a new bundle id and provisioning profile. That needs
Apple credentials once, possibly interactively by the owner. A failure to start an activity
(unsupported, or disabled in Settings) is silent: the notification still fires.

**Tests.** The hook starts, replaces and ends the activity with the rest, and tolerates a failure.

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
