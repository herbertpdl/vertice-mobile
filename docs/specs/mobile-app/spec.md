# Spec: Vertice Mobile — trainer app (component library + screens)

> **Living document.** Agents implementing this spec update it as they go: tick the PR's
> checklist, fill in its PR number and status in [PR log](#pr-log), and record any decision or
> deviation in [Decisions log](#decisions-log). Read the whole file before starting a PR.

- **Repo:** vertice-mobile (Expo SDK 57, React Native 0.86, Expo Router, TypeScript)
- **API:** [vertice-bff](https://github.com/herbertpdl/vertice-bff) REST, contract in
  `src/lib/api/schema.ts` (generated, see `CLAUDE.md`)
- **Design source:** pen.dev file `/Users/herbertlago/Documents/Vertice Web.pen` (same file as the
  web), read **only** through the `pencil` MCP tools. Mobile frames:
  - `Tskd4` **DS - Mobile Components** — the mobile component library (every component is
    prefixed `M `).
  - `O3tUmW` **Vertice — Mobile App** — the mobile screens (`M - <Nome>`), in rows.
- **Web counterpart:** [vertice-web-react](https://github.com/herbertpdl/vertice-web-react) —
  same tokens, same pt-BR copy, same validation rules, same error-code copy. Below, `web:<path>`
  is shorthand for `https://github.com/herbertpdl/vertice-web-react/blob/main/<path>` and
  `bff:<path>` for `https://github.com/herbertpdl/vertice-bff/blob/main/<path>`.
- **Audit IDs** (P2-05, P2-13, …) refer to the cross-repo health audit's plan,
  `audits/2026-10-09/implementation-plan.md` in the Vertice workspace root (not in any repo).

## 1. Scope

**In scope (v1): the trainer app**, i.e. every mobile screen in the design file: auth (login,
cadastro, splash), the four tabs (Início, Alunos, Exercícios, Perfil), student detail (plans,
feedback, progress), plan detail and form, workout editor, exercise catalog/detail/form, profile
and account (edit, password, export, delete), consent gate.

**Out of scope (v1), tracked as follow-ups:**
- **Client (student) experience** (do a workout, record sets, feedback, progress) — audit item
  P2-13 recommends mobile be the client app; the design file only has trainer screens today. It
  needs a PRD (`prd-creator`) and designs first. Until then any non-`TRAINER` session
  (`CLIENT`, `ADMIN`) sees an "app do aluno em breve" notice and can sign out (see PR 6).
- Password reset ("Esqueceu a senha?") — **no BFF endpoint exists**; the link is removed from the
  design.
- Push notifications, offline editing, biometrics, tablets/landscape (portrait phone only).

## 2. Architecture decisions

| Topic | Decision |
|---|---|
| Styling | `StyleSheet.create` + typed tokens from `src/theme/` (no NativeWind/Tailwind). Never hardcode a color, spacing, radius or font size in a component: import from `@/theme`. |
| Tokens | `src/theme/tokens.ts` mirrors `web:src/app/globals.css` 1:1 (`--color-surface-hover` → `colors.surfaceHover`, `--space-4` → `space[4]`, `--radius-md` → `radius.md`, `--text-base` → `fontSize.base`). `npm run tokens:check` diffs them against the web file at the commit pinned in `src/theme/.web-ref` (`--local` reads a sibling vertice-web-react checkout), and CI runs it. Mobile-only sizes (52 px control height, 44 pt hit target, off-scale paddings) live in `src/theme/mobile.ts`, named after the pen.dev component they come from; the mobile type scale (17 px nav title, 26 px titles…) lives in `src/theme/typography.ts`. No new colors anywhere: tints are token colors with an alpha via `withAlpha` (`src/theme/color.ts`, PR 3) — e.g. the tab bar's `#141A22CC` is `withAlpha(colors.surface, 0.8)` — and the only non-token colors are the black/white overlays (`overlay.mediaScrim`, `overlay.mediaGlyph`, `overlay.backdrop`). Fixed off-scale sizes of single components live in `sizes` (`mobile.ts`), named after the component. |
| Theme | Dark only (like the web). `app.json` `userInterfaceStyle: "dark"`, `expo-status-bar` `style="light"`, root view background `colors.bg`, splash/adaptive-icon background `colors.bg`. |
| Fonts | `@expo-google-fonts/inter` (400/500/600/700) and `@expo-google-fonts/space-grotesk` (500/600/700; the design never uses 400) through `useFonts`, imported per weight subpath, splash held until loaded. **Weight is selected by family name, never `fontWeight`** (Android ignores `fontWeight` on custom fonts) — the `Text` primitive maps `weight` → family. |
| Components | `src/components/ui/<Name>/{<Name>.tsx,index.ts,<Name>.test.tsx}` (design-system kit, 1:1 with `M ` components), `src/components/domain/` (product pieces: rows, cards, sheets), `src/components/layout/` (Screen, NavBar, TabBar). Same one-folder-per-component rule as the web; import through the folder index. |
| Kit preview | A dev-only route `src/app/(dev)/kit.tsx` (guarded by `__DEV__`, not linked in release) renders every kit component in every state — the mobile stand-in for the web's Storybook. |
| Navigation | Expo Router. `(app)` behind the session (`Stack.Protected`, declared first so a blocked route falls back to it or to `login`), with `(tabs)` (`index`=Início, `alunos`, `exercicios`, `perfil`) and stack screens pushed over the tabs; `login` and `cadastro` at the root, signed-out only. The consent gate, the error state and the non-trainer notice render inside `(app)/_layout` (not routes). Bottom-sheet screens (Novo aluno, Editar aluno, Link de acesso, Editar perfil…) are routes with `presentation: "formSheet"` (native sheet, swipe to dismiss on iOS; react-native-screens documents a fallback to `modal` on Android — verify on an Android device in PR 8, the first route sheet, and if it reads wrong, render those routes with the kit `Sheet` on Android). In-form pickers (select, date, multi-select) use the kit `Sheet` (RN `Modal`). React Navigation is vendored by expo-router in SDK 57: import its hooks (`usePreventRemove`, …) from `expo-router/react-navigation`, never `@react-navigation/*`. |
| Tab bar | Custom `tabBar` for `Tabs` rendering the `M Tab Bar` capsule with a safe-area bottom inset. Blur via `expo-blur` on iOS; on Android use the design's translucent `#141A22CC` surface without blur (Android blur needs an explicit blur target and costs frames). |
| Status bar | The `M Status Bar` in the design is the device's; never draw it. Screens use safe-area insets (`react-native-safe-area-context`). |
| Server state | TanStack Query, query keys per resource (`["students"]` — the web's name for the roster —, `["client", id, "overview"]`, `["trainingPlan", id]`, `["workout", id, "full"]`, `["exercises", filters]`, `["me"]`, `["dashboard"]`…); mutations invalidate by key (same convention as the web). `focusManager` on `AppState`, `onlineManager` on `@react-native-community/netinfo`, no retries on 4xx. Pull-to-refresh on every list. |
| API modules | `src/lib/api/<resource>.ts` thin typed wrappers over `apiFetch` (as `web:src/lib/api/`), types aliased from the generated schema in `src/lib/api/types.ts`. Never inline `apiFetch` in a screen. Paths are the generated keys, `/api` prefix included. |
| Auth | `POST /api/auth/login` returns `{ token, user }`. Token in `expo-secure-store` (never AsyncStorage), sent as `Authorization: Bearer`. `AuthProvider` (`src/lib/auth/`) restores it at boot (splash stays up), exposes `signIn/signOut`. A 401 on an **authenticated** call signs out and clears the query cache; the public calls (`/api/auth/login`, `/api/auth/register`, `/api/legal/versions`, `/api/auth/password/setup`) are exempt, so login keeps its own "e-mail ou senha inválidos" copy. v1 is trainer-only: any non-`TRAINER` session lands on the "app do aluno" notice. **Token lifetime:** the BFF issues 8 h JWTs with no refresh token (audit P2-05 step 3, undecided). v1 accepts re-login after expiry; an expiry mid-edit in the workout editor keeps the local draft in memory, shows the login sheet over it and retries the save after sign-in (PR 11). A refresh token is a BFF change tracked outside this spec. |
| Consent | After sign-in, compare `GET /api/auth/me` `consent.termsVersion` with **`GET /api/legal/versions` `.terms`** (the BFF's current version — mobile ships no copy of the texts, it opens the web's live `/termos`, so an embedded constant would go stale; see the comment in `web:src/lib/legal/versions.ts`). Outdated or missing → blocking consent screen → `POST /api/auth/me/consent` with that version. Cadastro sends the same value as `acceptedTermsVersion`. Fails closed: if either call fails, error state + "Tentar novamente", never the app. |
| Forms | `react-hook-form` + `zod` + `@hookform/resolvers`. Schemas ported from `web:src/lib/validation/` (same bounds and pt-BR messages; `bounds.ts` copied, contract enums asserted against the generated types in a test). Read values with `useWatch`, never `watch()` (React Compiler). |
| Errors | `ApiError` keyed by `code`; pt-BR copy from `src/lib/api/errorMessages.ts` (port of `web:src/lib/api/errorMessages.ts`), never `error.message`. `FORBIDDEN`/`NOT_FOUND` on a detail screen → back to the list with a toast. |
| Dates | Port `web:src/lib/format.ts`, `web:src/lib/plans.ts`, `web:src/lib/calendar.ts` + their tests. Instants formatted in `America/Sao_Paulo`; business dates (`yyyy-MM-dd`) never pass through `new Date()` in local time. **Verify Hermes honours `Intl.DateTimeFormat` `timeZone`** (test on device in PR 5; add `@formatjs/intl-datetimeformat` polyfill if not). PR 5 bumps `.bff-ref` to vertice-bff `main` so `Dashboard.completedToday[].completedAt` (an instant) exists; render it in `America/Sao_Paulo` and **never use the deprecated `time`** (`HH:MM` UTC, ~3 h ahead of the trainer's clock). |
| Crash reporting | `@sentry/react-native` with PII scrubbing (audit P2-05 step 5) lands in PR 14, before the first internal build — not in v1's feature PRs, which have no build to report from. |
| Media | `expo-image` for thumbnails (YouTube `img.youtube.com/vi/<id>/hqdefault.jpg`, else a dumbbell placeholder). Videos open externally (`expo-web-browser`) — no inline player in v1. |
| Sharing / files | Access links via RN `Share`. Data export: `GET /api/auth/me/export` → `expo-file-system` → `expo-sharing`. |
| Accessibility | Every pressable has `accessibilityRole` + `accessibilityLabel`; min 44×44 hit area (`hitSlop` where the visual is smaller); `accessibilityState` for selected/disabled/checked; field errors announced (`accessibilityLiveRegion`/`AccessibilityInfo.announceForAccessibility`); respect `allowFontScaling` (cap with `maxFontSizeMultiplier` on dense rows only). |
| Performance | `FlatList` with stable `keyExtractor`, memo-free components (React Compiler is on — no manual `useMemo`/`useCallback`/`memo`), images sized, no inline-heavy re-renders in lists, skeletons instead of spinners for first load. |
| Tests | `jest-expo` + `@testing-library/react-native`. Every kit component has a test (renders, states, press, a11y props). Pure modules (`format`, `plans`, validation, `apiFetch`, auth storage) have unit tests. CI runs `npm test`. Screens get a smoke test with mocked API. |

## 3. Design → code inventory

### 3.1 Tokens (from `globals.css` / pen.dev variables)
Colors: `bg #0A0E14`, `surface #141A22`, `surfaceHover #1C2430`, `surfaceActive #232C3A`,
`border #232C3A`, `borderStrong #333F50`, `textPrimary #F2F6FA`, `textSecondary #9AA7B8`,
`textTertiary #5C6A7C`, `primary #00E5FF` (`Hover #73F1FF`, `Active #00B8CC`, `Text #04141A`),
`secondary #7C4DFF` (`Hover #AA8BFF`, `Active #6339E0`), `success #2ED573`, `warning #FFB020`,
`danger #FF5C5C` (`Hover #FF9696`), `info #4DA6FF`.
Space `1:4 2:8 3:12 4:16 5:20 6:24 8:32 10:40 12:48 16:64`. Radius `sm 6, md 10, lg 16, xl 24,
full 999`. Font sizes `xs 12, sm 13, base 14, md 16, lg 18, xl 22, 2xl 28, 3xl 36, 4xl 48,
5xl 64`. Families: Inter (base), Space Grotesk (heading).

### 3.2 Mobile kit components (pen.dev `Tskd4` → `src/components/ui`)
Existing in pen.dev before this work: M Status Bar (device — not drawn), M Nav Bar, M Tab Bar,
M Button, M Button Secondary, M Button - Loading, M Icon Button, M Field, M Search Field, M Chip,
M Stat Card, M Badge. The rest are being componentized by the design agent — **§3.4 is filled
from its report; implement from the pen.dev node, not from this list.**

| Code component | pen.dev | Notes |
|---|---|---|
| `Text` | (typography) | variants mapping the type scale; `weight` → font family |
| `Button` | M Button / Secondary / Loading (+ Danger, Ghost, pressed, disabled) | `variant`, `loading`, `disabled`, `icon`; 52 h, radius lg, 16/600 |
| `IconButton` | M Icon Button | 44×44 circle, `variant` primary/surface |
| `TextField` | M Field | label, placeholder, error (danger border + `circle-alert`), help, trailing icon, password eye toggle, focused border |
| `TextArea` | M Text Area | counter "n / max caracteres" |
| `SearchField` | M Search Field | pill, search icon, clear button |
| `SelectField` | M Select Field + M - Selecionar (Sheet) | single select; the sheet is built in |
| `MultiSelectField` | M Multi Select Field + M - Grupos Musculares (Sheet) | tags of chosen values; draft + "Aplicar (n)" |
| `DateField` + `Calendar` | M Date Field + M Calendar / M - Calendário (Sheet) | value is `yyyy-MM-dd` string only |
| `Checkbox` | M Checkbox | label can contain links |
| `Chip` | M Chip | selected = primary fill |
| `Badge` | M Badge (+ tones) | `tone`: neutral/success/warning/danger/info/outline; `CountPill`, `Tag` alongside |
| `Avatar` | M Avatar | initials, sizes 40/48/64 |
| `StatCard` | M Stat Card | label, value (heading), helper with tone |
| `SegmentedTabs` | M Segmented Tabs | optional count pill |
| `SectionHeader` | M Section Header | title + optional link |
| `TextLink` | M Text Link | |
| `Divider` | M Divider | plain / labelled ("ou") |
| `ProgressBar`, `WeekDots` | M Progress Bar, M Week Dots | |
| `Spinner`, `Skeleton` | M Spinner, M Skeleton* | `Skeleton.Line/Circle/Block` |
| `EmptyState`, `ErrorState` | M Empty State, M - Erro (Tela) | |
| `Banner`, `StatusBanner`, `Toast` (+ `ToastProvider`, `useToast`) | M Form Error / Info Banner, M Offline / Error Banner, M Toast | show a toast after the sheet that raised it has closed |
| `Sheet` (+ `SheetModal`), `ActionSheet`, `ConfirmDialog` | M Bottom Sheet, M Action Sheet, M Confirm Dialog | |
| `ListRow`, `OptionRow`, `InfoCard`, `PickerField` | M List Row, M Option / Checkbox Row, M Info Card, M Select Field box | |
| `NavBar` (layout) | M Nav Bar | back, centered 17/600 title, action |
| `TabBar` (layout) | M Tab Bar | capsule, blur, active pill |
| `Screen` (layout) | — | safe area, bg, scroll/keyboard handling |

### 3.3 Screens (pen.dev `O3tUmW` → routes)

| Route | pen.dev screen(s) | Data |
|---|---|---|
| boot | M - Splash (Carregando) | session restore, fonts |
| `login` | M - Login, M - Login (Erro de Validação) | `POST /api/auth/login` |
| `cadastro` | M - Cadastro, M - Cadastro (Erros de Validação) | `GET /api/legal/versions`, `POST /api/auth/register` |
| (in `(app)/_layout`) | M - Termos (Consentimento), M - Termos (Erro) | `GET /api/auth/me`, `POST /api/auth/me/consent` |
| `(app)/(tabs)/index` | M - Dashboard, M - Dashboard (Loading) | `GET /api/dashboard` |
| `(app)/feedbacks` | M - Feedbacks | `GET /api/feedback` |
| `(app)/(tabs)/alunos` | M - Alunos, M - Alunos (Vazio), M - Alunos (Loading) | `GET /api/clients` |
| (sheet on Alunos) | M - Novo Aluno (Sheet), M - Novo Aluno (Sucesso) | `POST /api/clients`, `POST /api/clients/{id}/setup-token` |
| `(app)/alunos/[id]` | M - Detalhe do Aluno (+ Feedbacks, Progresso, Loading) | `GET /api/clients/{id}/overview`, `GET /api/training-plans?clientId=`, `GET /api/feedback` (no `clientId` filter exists: the tab filters `EnrichedFeedback.clientId` client-side until audit P2-06 adds `?clientId=`), `GET /api/exercises/{id}/progress?clientId=` |
| `(app)/alunos/[id]/editar` (sheet) | M - Editar Aluno (Sheet), M - Ações do Aluno | `PATCH /api/clients/{id}` |
| `(app)/alunos/[id]/acesso` (sheet) | M - Link de Acesso (Sheet) | `POST /api/clients/{id}/setup-token` |
| — (confirm) | M - Encerrar Vínculo (Confirm) | `DELETE /api/clients/{id}` |
| `(app)/planos/novo?clientId=`, `(app)/planos/[id]/editar` | M - Novo Plano, M - Calendário (Sheet) | `POST /api/training-plans`, `PATCH /api/training-plans/{id}` |
| `(app)/planos/[id]` | M - Detalhe do Plano (+ Loading), M - Excluir Plano | `GET/DELETE /api/training-plans/{id}`, `GET /api/clients` (the student's name, usually from cache) |
| `(app)/planos/[id]/treinos/novo?dayOfWeek=`, `(app)/treinos/[id]` | M - Editor de Treino (+ Novo, Salvando), M - Adicionar Exercício (Sheet), M - Descartar alterações, M - Excluir Treino | `GET /api/workouts/{id}/full`, `POST /api/training-plans/{planId}/workouts`, `PATCH /api/workouts/{id}` + `PUT /api/workouts/{workoutId}/exercises`, `DELETE /api/workouts/{id}` |
| `(app)/(tabs)/exercicios` | M - Catálogo de Exercícios, M - Exercícios (Loading) | `GET /api/exercises?muscleGroupId=&q=`, `GET /api/muscle-groups` |
| `(app)/exercicios/[id]` | M - Detalhe do Exercício (+ padrão), M - Excluir Exercício | `GET/DELETE /api/exercises/{id}` |
| `(app)/exercicios/novo`, `(app)/exercicios/[id]/editar` | M - Novo Exercício, M - Grupos Musculares (Sheet) | `POST /api/exercises`, `PATCH /api/exercises/{id}` |
| `(app)/(tabs)/perfil` | M - Perfil | `GET /api/auth/me` |
| `(app)/perfil/editar` (sheet) | M - Editar Perfil (Sheet) | `PATCH /api/auth/me` |
| `(app)/perfil/senha` | M - Alterar Senha | `POST /api/auth/password` |
| `(app)/perfil/excluir` | M - Excluir Conta | `DELETE /api/auth/me` |
| — | export (action on Perfil) | `GET /api/auth/me/export` |
| legal | links | open web `/termos`, `/privacidade` with `expo-web-browser` |
| (in `(app)/_layout`) | role notice (built from `EmptyState`) | any non-`TRAINER` role in v1 |

**Workout editor on mobile uses explicit save** (design: "Alterações não salvas" + Descartar /
Salvar treino), not the web's debounced autosave. New workout: one nested
`POST /api/training-plans/{planId}/workouts`. Existing: `PATCH /api/workouts/{id}` (name/day)
then `PUT /api/workouts/{workoutId}/exercises` (whole tree). A 409 `PRECONDITION_FAILED` on the
`PUT` (a client already recorded data) falls back to the per-item endpoints
(`/api/workout-exercises/{id}`, `/api/workout-exercises/{workoutExerciseId}/sets`,
`/api/exercise-sets/{id}`),
the same rule as the web's autosave engine — read
[the web spec](https://github.com/herbertpdl/vertice-web-react/blob/main/docs/specs/create-workout-with-exercises/spec.md)
before PR 11. Leaving with unsaved changes asks to discard (`usePreventRemove` from
`expo-router/react-navigation`).

### 3.4 Design agent report (componentization + screen changes, 2026-10-20)
The pen.dev mobile library was completed by a design agent. **Read component values from the
nodes below with the `pencil` MCP tools (`Get(id, {depth: 4})`), not from screenshots.** All
"variant" components are refs of their base, so the base node holds the shared values.

**Components (`Tskd4` "DS - Mobile Components")**
- Display: M Avatar 40/48/64 `rVxKA`/`xAmSK`/`z4Xig`; M Badge `qOr6I` (12/600) + Success
  `iCugD`, Warning `J9zCv`, Danger `LTrgl`, Info `pmgXd` (token at alpha `1F`), Outline `adZeY`
  ("Padrão"); M Count Pill `O1ESX`; M Tag `uETze`; M Segmented Item `K6PhW`/`REEma` + M Segmented
  Tabs `v9G09`; M Section Header `sv3eO`; M Text Link `oHqfx`; M Divider `ESP64`, M Divider Or
  `l9XwhF`; M Week Dot `FqDOR`/`CuLWM` + M Week Dots `q3GDI`; M Progress Bar `fhBQZ`
  (+ `S55v4X`/`nbim9`/`eqgdu`); M Exercise Thumb `B1Qbv` / Placeholder `VlSAC`; M Video Thumbnail
  `d2jZxp` (16:9, "Abrir vídeo" chip); M Link Box `a7neI`; M Chart Bar `q6w9CK`; M Stat Card
  `yzS8w` (helper line "M Stat Helper", 12/400 secondary); M Chip Selected `DtWsn`.
- Feedback/state: M Form Error Banner `eTYNh`, M Info Banner `nDrZ6`, M Toast `wFGNi` / Error
  `qSNZf`, M Offline Banner `irpee`, M Error Banner `SH4JF`, M Empty State `hsoLm`, M Skeleton
  Line/Circle/Block `i7sVM`/`WnOD9`/`IBxjG`, M Spinner `sGfl4`.
- Lists: M Feedback Row `Yg7CH`, M Plan Ending Row `eQknn`, M Completed Workout Row `xXYu3`,
  M Student Card `a4GBj`, M Exercise Card `h5cL2Q`, M Exercise Pick Card `tuqxK` / Selected
  `G9IlS`, M Plan Card `Vp90W`, M Day Row `YgwDL` / Rest `dNJzA`, M Info Row `RBaKm`, M Info Card
  `CMEEF`, M List Row `gYNSF` / Danger `kUKZs`, M Option Row `SYKiv` / Selected `Poa8p`,
  M Checkbox `jojI8` / Unchecked `Z4GVdW`, M Checkbox Row `M661r`.
- Fields: M Field `L8Z17V` + Focused `H6v9F`, Error `f2OTg`, Disabled `W4DHW2`; M Password Field
  `Y2DD0`; M Select Field `xchSE` / Filled `r4vY0` / Error `iTwTj`; M Date Field `mw9kO`; M Multi
  Select Field `WwAvf`; M Text Area `SeqUo`; M Search Field `G8t7w`.
- Buttons: M Button `t7suk` + Pressed `klUcP`, Disabled `UN500`; M Button Secondary `qy8Ln` +
  Pressed `X1KUWy`, Disabled `C5osK`; M Button Danger `Hdg01` + Pressed `MEqN4`; M Button Ghost
  `QrAfu`; M Button - Loading `PZ0j2`; M Icon Button `e5TOp`.
- Editor: M Set Header `P0pNp`, M Set Row `Y2DJbG`, M Add Row Button `Q7cS7J`, M Note Field
  `uRAng`, M Exercise Editor Card `u7UuK`, M Save Bar `Tnzr5`, M Add Exercise Button `xNs92`.
- Overlays: M Bottom Sheet `v2tHV` (fill `surface`, radius 24/24/0/0, padding 10/20/34/20,
  content slot `h17Ktb`, footer slot `LMB94`), M Action Sheet `s1sqQY`, M Confirm Dialog `kJk3l`
  (w330, radius xl, backdrop `#000000A8`), M Calendar `nOtrs`.
- Bars: M Nav Bar `U5IlyK`, M Tab Bar `s5B19Z` (labels 12/600), M Status Bar `xFIOQ` (device — not drawn).

**Screens (`O3tUmW`)** — rows A `yzHNt` (auth & home), B `P1HFEq` (gestão), C `fWcYT` (loading),
D `w5l59E` (perfil & conta), E `ooZRN` (alunos & feedbacks), F `iJX0Q` (planos, treinos,
exercícios, sheets, confirms), G `oV2Mh` (estados). Screen ids are listed by row in the design
file; §3.3 maps them to routes.

**Design decisions to follow**
- ⋮ in the nav bar opens an M Action Sheet: Aluno (Editar aluno, Link de acesso, Encerrar
  vínculo), Plano (Editar plano, Excluir plano — the "Editar plano" button stays too), Editor
  (Excluir treino), own Exercício (Excluir exercício). Starter exercises have no ⋮ and no edit.
- Plan edit form = Novo Plano layout, nav title "Editar plano", button "Salvar".
- Plan status from dates: Ativo → Success badge, Agendado → Info, Encerrado → neutral.
- Single-select sheets close on tap (no footer); day of week uses the same 7-option sheet.
  Muscle groups use the multi-select sheet with "Aplicar (n)", at least one required.
- `textTertiary` (~3.5:1) only for icons, placeholders, disabled and other-month calendar days;
  all metadata text uses `textSecondary` (AA).
- Inline text links (Cadastro terms) are underlined; tag remove "x" is hidden in fields (edit
  through the sheet).
- Sheets keep 34 pt bottom padding above the home indicator; dialogs are centred over the
  `#000000A8` backdrop. Toasts: bottom, inset 20, above the tab bar or Save Bar.

## 4. PR plan

PRs are **stacked**: each branch starts from the previous PR's branch and its PR targets that
branch, so each diff stays reviewable while earlier PRs await merge. When a PR merges, rebase
the next one onto `main` and retarget it. Every PR: `npm run typecheck`, `npm run lint --
--max-warnings 0`, `npm test`, `npm run api:types -- --check`, `npx expo install --check` green;
then a **fresh agent runs the `code-review` skill** on the branch (Standards + this spec) and its
blocking findings are fixed before the PR is considered done. Commit messages follow the repo's
conventional style (`feat(ui): …`, `chore: …`).

### PR 1 — `docs/mobile-app-spec`: this spec
- [x] `docs/specs/mobile-app/spec.md`
- [x] Pointer from `CLAUDE.md`

### PR 2 — `feat/theme-foundation`: tokens, fonts, dark theme, test harness
- [x] `src/theme/{tokens,mobile,typography,fonts,index}.ts`; `src/theme/.web-ref`; `scripts/check-tokens.mts` (+ `scripts/lib/tokens.ts`) + `npm run tokens:check` (`--local[=PATH]`; `--check` accepted, it never writes)
- [x] Fonts via `@expo-google-fonts/*` + `useFonts`, splash held until loaded (`expo-splash-screen`)
- [x] `app.json`: `userInterfaceStyle: "dark"`, splash/adaptive icon bg `#0A0E14`, `name: "Vertice"`
- [x] `Text` primitive (+ test)
- [x] `jest-expo` + `@testing-library/react-native`, `npm test`, CI step; tests for the token parser/diff (`scripts/lib/tokens.test.ts`) and every text preset
- [x] `CLAUDE.md`/`README.md` updated (styling rules, test command)

### PR 3 — `feat/ui-kit-controls`: form & display primitives
- [x] `Button` (primary/secondary/danger/ghost, pressed, disabled per variant, loading, icon), `IconButton`, `FieldFrame` (shared M Field structure), `TextField` (focus/error/help/disabled/password), `TextArea` (counter), `SearchField` (clear), `Checkbox` (rich label + `InlineLink`), `Chip`, `Badge` (+ `CountPill`, `Tag`), `Avatar` (+ `initials`), `StatCard`, `Spinner`, `Skeleton`, `ProgressBar`, `WeekDots`, `Divider`, `TextLink`, `ExerciseThumb` (expo-image) — `src/components/ui/index.ts` barrel
- [x] `src/theme/color.ts` (`withAlpha`, `TINT_ALPHA`, `overlay`), per-component `disabledOpacity`, named off-scale sizes in `mobile.ts`; `src/lib/video.ts` (YouTube still, http(s)-only)
- [x] tests per component (RNTL 14: `await fireEvent…`, `toBeSelected`/`toBeBusy`/`toBeChecked`); `jest.setup.ts` with the Worklets/Reanimated mocks; lucide mapped to its CJS build
- [x] `(dev)/kit` preview route, checked on react-native-web at 390 pt against the pen.dev values

### PR 4 — `feat/ui-kit-layout`: layout, navigation & overlays
- [x] layout: `Screen` (safe area, keyboard, pull to refresh, pinned header/footer, tab inset), `NavBar`, `TabBar` (+ `tabBarInset`; blur on iOS, translucent fill on Android)
- [x] `SectionHeader`, `SegmentedTabs`, `EmptyState`/`ErrorState`, `Banner`/`StatusBanner`, `InfoCard`, `ListRow`, `OptionRow`, `Toast` (+ `ToastProvider`/`useToast`, mounted in the root layout), `Sheet` (+ `SheetModal`), `ActionSheet` (iOS: action runs on `onDismiss`), `ConfirmDialog` (+ `useSingleFlight`), `SelectField` (+ `PickerField`), `MultiSelectField`, `DateField` + `Calendar`
- [x] ported from the web (moved up from PR 5, DateField needs them): `src/lib/{format,calendar,plans}.ts` + tests, `formatMonthTitle`; `CALENDAR_DAY_ORDER`/`DAY_INITIAL` in `labels.ts`; `npm run test:hostile-tz` (+ CI)
- [x] tests for every component (incl. `Calendar`; both ActionSheet platform paths); kit gallery sections (pickers nested in a sheet); checked on react-native-web
- [ ] **device checklist** (none available here): Android keyboard inside `Sheet` and over `Screen` footers (`KeyboardAvoidingView behavior="height"`); pickers nested in a sheet present and dismiss on iOS (kit → Abrir sheet); `formSheet` routes on Android — moved to PR 8, the first route sheet

### PR 5 — `feat/api-auth-foundation` (audit P2-05)
- [x] bump `src/lib/api/.bff-ref` to vertice-bff `main` (`0a98343`) + `npm run api:types` (picks up `completedToday[].completedAt`)
- [x] `apiFetch`/`apiClient`: bearer token, 15 s timeout, network/timeout/parse failures → `ApiError` (web constructor shape), `Content-Type` only with a body, `retryAfter`; 401 on authenticated calls → sign-out; public routes `{ auth: false }`; `apiDownload` + `attachmentFilename`
- [x] `env.ts`: http(s) URL, trailing slash trimmed; release builds require `https:` and refuse loopback hosts
- [x] `src/lib/auth/` (`tokenStorage` on SecureStore, `AuthProvider`/`useAuth`, `useMe`); splash held until the session is restored
- [x] ported from the web: `src/lib/api/*` resource modules (+ mobile `auth.ts`/`legal.ts`, `changePassword`), `types.ts`, `errorMessages.ts`, `rateLimit.ts`, `src/lib/validation/*`, `src/lib/masks/cpf.ts`, with their tests (vitest → jest)
- [x] query client: no 4xx retries, `focusManager` ← AppState, `onlineManager` ← NetInfo
- [x] root `ErrorBoundary` (design's error state + retry)
- [x] tests: `apiFetch`, `env`, token storage, `shouldRetry`, `AuthProvider` (restore, sign in/out, 401 → expired)
- [ ] Hermes `Intl` `timeZone` check on a device (none here) — the format tests run in Node's ICU
- [ ] `eas.json` profiles per environment — with PR 14 (store readiness), which owns the build setup

### PR 6 — `feat/auth-screens`
- [x] routes: `(app)` behind `Stack.Protected` (declared first, so a blocked route falls back to `login`), `login`/`cadastro` signed-out only, `(dev)/kit`; scaffold `src/app/index.tsx` deleted; placeholder `(app)/index` until PR 7
- [x] `(app)/_layout` gate (`useSessionGate`): `M - Splash (Carregando)` while `me` + legal versions load → non-`TRAINER` notice → `M - Termos (Consentimento)` (accept = `POST /api/auth/me/consent` with the BFF's version) / `M - Termos (Erro)` (fails closed) → app
- [x] Login (`M - Login`, error banner + field errors, 401 "E-mail ou senha inválidos", 429 wait copy, session-expired info banner), Cadastro (`M - Cadastro`, CPF mask, password help, terms checkbox with `InlineLink`s to the web's `/termos` and `/privacidade`, `acceptedTermsVersion` from `GET /api/legal/versions`)
- [x] `Logo`/`LogoMark` (exact pen.dev path), `FormTextField`, `EXPO_PUBLIC_WEB_URL` + `openLegalPage` (in-app browser), `ListRow role="link"` → external-link glyph
- [x] tests: Login, Cadastro, `useSessionGate`; `src/test/{bff,render}` kit
- [ ] visual pass on web/device (the integrated browser hung during this PR)

### PR 7 — `feat/home-dashboard`
- [x] `(app)/(tabs)` with `TabBar` (Início, Alunos, Exercícios, Perfil; the last three are "em breve" placeholders until PRs 8, 12, 13)
- [x] Início (`M - Dashboard`): greeting by São Paulo hour + first name, "N feedbacks novos · M planos terminando", four stat cards, three sections (3 rows each, empty lines), `M - Dashboard (Loading)` skeleton, error state with retry, pull to refresh, `M Offline Banner` while offline (`useIsOffline` ← React Query `onlineManager`)
- [x] `completedToday[].completedAt` formatted in São Paulo; the deprecated `time` is never read
- [x] Feedbacks (`M - Feedbacks` / `(Vazio)`): newest first, "Hoje, 07:40 / Ontem, 19:12 / Seg, 18:40" timestamps (`formatRecentInstant`), pull to refresh
- [x] domain rows: `FeedbackRow`, `PlanEndingRow` (≤ 7 days → warning badge), `CompletedWorkoutRow`; `greetingFor`, `formatRecentInstant` (+ hostile-TZ tests)
- [x] feedback rows open the student (PR 9); plan-ending rows stay static (the dashboard gives no ids)

### PR 8 — `feat/students-list`
- [x] Alunos tab (`M - Alunos`, `(Vazio)`, `(Loading)`): count / "N resultados para a busca", "+" (Novo aluno), search (case- and accent-insensitive), plan filter chips (as the web), `M Student Card`s (plan or "Sem plano ativo" in warning, this week's last workout or "Sem treino nesta semana", Mon–Fri `WeekDots`), empty roster vs empty search (Limpar busca), skeleton, error strip / offline banner, pull to refresh
- [x] Novo aluno → success (`M - Novo Aluno (Sheet)` / `(Sucesso)`): `POST /api/clients` (CPF digits), then `AccessLinkPanel` — the web's `/definir-senha?token=` link (`M Link Box` + copy via `expo-clipboard`, expiry "Expira em 3 dias · 23 out, 14:30" in São Paulo, "Compartilhar link" via the share sheet); a `setup: null` response says to issue a new link from the student page
- [x] `/alunos/[id]` placeholder (PR 9)
- [x] tests: roster logic, screen (filters, search, empty states, error, create + copy, setup null), `StudentCard`; the test query client no longer leaks the mutation GC timer that kept Jest alive

### PR 9 — `feat/student-detail`
- [x] `M - Detalhe do Aluno` (+ Loading): identity (avatar 64, name, e-mail, "Plano ativo"/"Sem plano" badge), four compact stat cards from `GET /api/clients/{id}/overview` (active plan + period, "3 de 5 treinos concluídos", last workout "Hoje · às 07:40", adherence over 4 weeks), `SegmentedTabs`, footer "Novo plano" (→ PR 10)
- [x] Planos tab: `GET /api/training-plans?clientId=`, `PlanCard`s sorted active → scheduled → finished, status from dates (Ativo/Agendado/Encerrado), empty state
- [x] Feedbacks tab (count pill): `GET /api/feedback` filtered by `clientId` client-side (no server filter yet), student-perspective `FeedbackRow`
- [x] Progresso tab: exercise `SelectField` (all exercises, as the web) → `GET /api/exercises/{id}/progress?clientId=` → `WeightChart` (last 8 weeks, latest bar full primary), empty states
- [x] ⋮ → `ActionSheet`: Editar aluno (`EditStudentSheet`: CPF left empty keeps the stored one, "Remover o CPF"), Link de acesso (`AccessLinkSheet`: generate on demand, 409 → "já definiu a senha"), Encerrar vínculo (`ConfirmDialog` → `DELETE /api/clients/{id}`, back to the roster)
- [x] 403/404 → back with a toast (`useRedirectOnError`); feedback rows on Início/Feedbacks now open the student
- [x] `/planos/[id]` and `/planos/novo` placeholders (PR 10); tests for the screen, `PlanCard`, `WeightChart`

### PR 10 — `feat/training-plans`
- [x] `M - Detalhe do Plano` (+ Loading): name + status badge (from dates), description + "Aluno: …" (name from the roster cache), `InfoCard` (Período with the year, Nível, Treinos), the week Monday → Sunday as `DayRow`s (workout cards → `/treinos/[id]`; rest days → "+ Adicionar treino" → `/planos/[id]/treinos/novo?dayOfWeek=`), footer "Editar plano" / "Novo treino", ⋮ → Editar / Excluir plano (confirm; 409 → "já tem treinos registrados"; success → back + invalidations)
- [x] `M - Novo Plano` and edit mode (`/planos/novo?clientId=`, `/planos/[id]/editar`): name, description (counter), Início/Término `DateField`s with the web's rules (`trainingPlanSchema`: a new plan can't start in the past, end after start, an existing plan may keep its dates), Nível `SelectField`; create → replaces the form with the new plan; edit → back
- [x] `trainingPlansQueryKey` / `trainingPlanQueryKey`, `fetchTrainingPlan(s)` take a signal; `DayRow`; workout-editor placeholders (PR 11)
- [x] tests: week layout, info, navigation, refused and successful delete, form validation, create body, past-start guard, edit body

### PR 11 — `feat/workout-editor`
- [ ] Editor (name, day select, exercise cards, set rows, notes), Adicionar exercício sheet, explicit save (POST / PATCH+PUT, 409 → per-item fallback), discard guard, Excluir treino; reducer/model unit tests

### PR 12 — `feat/exercises`
- [ ] Catálogo (search debounce, group chips), Detalhe (thumbnail → external video, starter read-only), Novo/Editar (multi-select groups), Excluir (in-use 409 copy)

### PR 13 — `feat/profile-account`
- [ ] Perfil, Editar perfil, Alterar senha, Exportar dados (file + share), Excluir conta (re-auth, `ACTIVE_CLIENTS`), Sair, legal links; README store checklist items ticked

### PR 14 — `chore/store-readiness`
- [ ] App identity (name, icons, splash), `eas.json` profiles, iOS privacy manifest, Android permissions audit, `expo-doctor` clean
- [ ] `@sentry/react-native` with PII scrubbing (audit P2-05 step 5), before the first internal build

### Later (separate PRDs)
- Client app (audit P2-13), password reset, push notifications, refresh tokens (audit P2-05 step 3, BFF).

## 5. Merge and deploy order
Mobile-only: no API or BFF change is required for v1 (every endpoint above already exists at the
pinned `.bff-ref`). If a PR bumps `.bff-ref` (e.g. to pick up `completedAt`), the BFF change must be
merged first. Rollback = revert the mobile PR; nothing server-side depends on it.

## PR log

| PR | Branch | GitHub | Status | Review |
|---|---|---|---|---|
| 1 | `docs/mobile-app-spec` | [#14](https://github.com/herbertpdl/vertice-mobile/pull/14) | open | reviewed: 2 blocking + 9 non-blocking, all fixed |
| 2 | `feat/theme-foundation` | [#15](https://github.com/herbertpdl/vertice-mobile/pull/15) | open (base #14) | reviewed: 2 blocking + 12 non-blocking, all fixed |
| 3 | `feat/ui-kit-controls` | [#16](https://github.com/herbertpdl/vertice-mobile/pull/16) | open (base #15) | reviewed: 2 blocking + 13 non-blocking, all fixed |
| 4 | `feat/ui-kit-layout` | [#17](https://github.com/herbertpdl/vertice-mobile/pull/17) | open (base #16) | reviewed: 1 blocking + 24 non-blocking, fixed (device-only items listed below) |
| 5 | `feat/api-auth-foundation` | [#18](https://github.com/herbertpdl/vertice-mobile/pull/18) | open (base #17) | reviewed: 1 blocking + 12 non-blocking, fixed |
| 6 | `feat/auth-screens` | [#19](https://github.com/herbertpdl/vertice-mobile/pull/19) | open (base #18) | reviewed: 2 blocking + 18 non-blocking, fixed or logged |
| 7 | `feat/home-dashboard` | [#20](https://github.com/herbertpdl/vertice-mobile/pull/20) | open (base #19) | reviewed: 2 blocking + 10 non-blocking, fixed or logged |
| 8 | `feat/students-list` | [#21](https://github.com/herbertpdl/vertice-mobile/pull/21) | open (base #20) | reviewed: 2 blocking + 21 non-blocking, fixed or logged |
| 9 | `feat/student-detail` | [#22](https://github.com/herbertpdl/vertice-mobile/pull/22) | open (base #21) | reviewed: 1 blocking + 14 non-blocking, fixed or logged |
| 10 | `feat/training-plans` | [#23](https://github.com/herbertpdl/vertice-mobile/pull/23) | open (base #22) | reviewed: 1 blocking + 11 non-blocking, fixed or logged |

## Decisions log
- 2026-10-20 — v1 is the **trainer** app because that is what the pen.dev mobile designs cover; the client app needs its own PRD + designs (audit P2-13).
- 2026-10-20 — Styling with `StyleSheet` + typed tokens instead of NativeWind: no extra build tooling on an Expo SDK pinned by `expo install --check`, and tokens stay greppable 1:1 with the web's CSS variables.
- 2026-10-20 — Workout editor uses explicit save on mobile (design), keeping the web's 409 → per-item fallback rule.
- 2026-10-20 — "Esqueceu a senha?" removed: no reset endpoint in the BFF.
- 2026-10-20 — PRs are stacked because merges are left to the owner.
- 2026-10-20 — Consent compares against `GET /api/legal/versions`, not an embedded constant (mobile doesn't ship the texts). Review of #14.
- 2026-10-20 — v1 accepts re-login after the 8 h token expires; refresh tokens are a BFF decision (audit P2-05 step 3) outside this spec.
- 2026-10-20 — Sentry moves into PR 14 (before the first internal build) instead of "later".
- 2026-10-20 — Typography presets follow the pen.dev frames *as normalized by the design agent* (no 11 px text; badges 12/600; overline 12/600 tracked 0.5, copy already uppercase; tab labels 10/600 mixed case). Re-read the design with `resolveInstances: true` before adding a preset. Review of #15.
- 2026-10-20 — `tsconfig` sets `types: ["jest", "node"]` (TS 6 no longer auto-includes `@types/*`); jest globals type-check in app code too — accepted for simplicity.
- 2026-10-20 — Bottom/action sheet fill changed in pen.dev from `#10161F` (not a token) to `$color-surface`; fields inside keep their borders, so contrast holds.
- 2026-10-20 — Tab bar labels are 12/600 in the final design → `smallStrong`; the `micro` (10) preset was removed.
- 2026-10-20 — Skeleton pulses between `surfaceHover` and `surfaceActive` (no gradient on RN without a native gradient module) on the web's 1.6 s period.
- 2026-10-20 — Password fields keep the eye toggle in the error state (the design shows the alert glyph); the danger border and message still mark the error.
- 2026-10-20 — `Spinner` is the glyph only; the design's 44×44 M Spinner frame is layout (center it in a 44 pt box when it stands alone). Review of #16.
- 2026-10-20 — `Checkbox` with a string label is a 14 secondary sentence beside the box (the Cadastro terms line); M Checkbox Row is `OptionRow mode="multiple"`. A checkbox error turns the ring danger (no error state in the design). Its toggle is a real 44×44 box (negative margin), not `hitSlop`, which a parent clips.
- 2026-10-20 — React Compiler + Reanimated 4: shared values use `.get()`/`.set()`, never `.value`.
- 2026-10-20 — Pressed styles can't be driven in the Jest renderer; components whose pressed look matters expose the style rule as a pure function (`buttonFill`) and test that.
- 2026-10-20 — Jest maps `lucide-react-native` to its CJS build (`moduleNameMapper`): its `react-native` entry is `.mjs`, which jest-expo's transform doesn't cover. Revisit if lucide changes its dist layout.
- 2026-10-20 — `DateField` opens the calendar sheet instead of the web's masked `dd/mm/aaaa` input (two taps beat typing with a mask on a phone); its value is still a `yyyy-MM-dd` string throughout.
- 2026-10-20 — Sheets are RN `Modal`s (fade backdrop + Reanimated slide-up); swipe-to-dismiss is not implemented — backdrop tap, the close button and Android back dismiss them.
- 2026-10-20 — Plan status label is "Encerrado" on mobile (the design), "Concluído" on the web; labels are per app.
- 2026-10-20 — Jest uses `react-native-safe-area-context`'s own mock (zero insets) globally.
- 2026-10-20 — `plans.ts` moved into PR 4 with `format.ts`/`calendar.ts` because it is the same port with the same hostile-TZ test run; its first consumer is PR 9. Review of #17.
- 2026-10-20 — Toasts render under the root `Stack`, so a sheet covers them: screens show a toast after the sheet that raised it has closed.
- 2026-10-20 — Tab labels cap font scaling at 1.2× so the floating capsule keeps the height `tabBarInset` assumes (measuring it at runtime was judged not worth a context for v1).
- 2026-10-20 — `ApiError` takes the web's constructor shape (`{ code, message, details }, status, retryAfter`) so error handling and its tests port unchanged; this app adds `NETWORK_ERROR`/`TIMEOUT`.
- 2026-10-20 — Only the token is persisted; the user (role, consent) always comes from `GET /api/auth/me`, so nothing about the user can be stale after an upstream change.
- 2026-10-21 — A 401 ends a session only if the rejected request carried the *current* token (`onUnauthorized(sentToken)`); requests sent without a token never sign out. Review of #18.
- 2026-10-21 — A Keychain read error means "no session this launch" and never deletes the entry (iOS fails reads while locked); a failed delete on sign-out is retried once and then surfaces.
- 2026-10-21 — Resource modules take an optional `{ signal }` so React Query can abort them (`queryFn: ({ signal }) => fetchX({ signal })`); add it to each module as its first screen uses it.
- 2026-10-21 — `expo-web-browser`, `expo-file-system` and `expo-sharing` were installed with PR 5's native deps; their first users are PR 6 (legal links) and PR 13 (data export).
- 2026-10-21 — The Terms version line on the consent screen shows the BFF's version string ("Versão 2026-10-draft"); the design's "atualizada em …" date has no source in the contract.
- 2026-10-21 — Screens live in `src/screens/<area>/`; route files only re-export them.
- 2026-10-21 — The session gate decides on cached *data*, never the error flag: a failed background refetch keeps the signed-in app (and its navigation state) on screen. Review of #19.
- 2026-10-21 — First-time consent (no accepted version) uses the web's "Antes de continuar" copy; pen.dev only draws the "Atualizamos nossos termos" variant.
- 2026-10-21 — CREF isn't asked at sign-up (pen.dev's Cadastro has no field; the contract makes it optional); it can be added from Perfil (PR 13).
- 2026-10-21 — Design ↔ code copy differences kept on purpose: login asks "Informe a senha" (older passwords may be shorter than 8), the CPF error is the schema's "CPF inválido", the consent version line shows the BFF's version string (no date in the contract).
- 2026-10-21 — On iOS the CPF `number-pad` has no return key, so the keyboard "next" chain stops there; accepted for v1.
- 2026-10-21 — Typed routes (`.expo/types`) are generated by the dev server and git-ignored, so CI doesn't check `href`s; follow-up: generate them in CI before `typecheck`.
- Follow-up — router-level tests with `expo-router/testing-library` (`renderRouter`): signed-in deep link to `/login`, sign-out from `(app)`, gate order.
- 2026-10-21 — Every list/detail screen keeps cached data when a refetch fails (M Error Banner strip with "Tentar" instead of the full error state, which only shows with no data) and shows M Offline Banner (with "Tentar") in every state, including the loading skeleton. Pull-to-refresh spins only for a pull (`usePullToRefresh`). Review of #20.
- 2026-10-21 — Dashboard copy follows the BFF, not the design: `recentFeedbackCount` is all-time ("Feedbacks · recebidos no total", summary "6 feedbacks") and `expiringPlans` covers 14 days ("próximos 14 dias"). Follow-up for vertice-bff: a 7-day "new feedback" count if the product wants the design's copy.
- 2026-10-21 — Dates in the mobile designs drop the "de" ("24 mai"): `formatDayMonth`. Empty-section lines use the web's copy.
- Follow-up — "Hoje/Ontem" labels and the greeting are computed at render; re-derive them when the app returns to the foreground (low priority).
- 2026-10-21 — Sheets that hold a flow (Novo aluno, Editar aluno, Link de acesso, Editar perfil) use the kit `Sheet`, not `presentation: "formSheet"` routes: the same look and behaviour on both platforms, no Android fallback to verify, and the one-time setup token never goes through route params. The §2 formSheet line is superseded.
- 2026-10-21 — The access link is the web's `/definir-senha?token=` page (`EXPO_PUBLIC_WEB_URL`): students set their password there, as with the web app's link. The token lives only in component state.
- 2026-10-21 — Mutations run with `networkMode: "always"`: offline they fail fast (`NETWORK_ERROR`) instead of pausing as "pending", which locked the sheet or dialog that started them. Queries keep the default (they pause and resume). Review of #21.
- 2026-10-21 — Feedback inside a sheet (link copied) is shown in place, never as a toast (the sheet covers the toast host). Sheets that hold a flow are remounted with a new `key` per opening, so they start clean without a reset effect (the React Compiler forbids synchronous `setState` in effects).
- 2026-10-21 — A 409 on Novo aluno goes on the e-mail field (as the web); a `setup: null` answer offers "Gerar link de acesso" inline. Mutations carrying the setup token use `gcTime: 0`.
- 2026-10-21 — M - Alunos (Loading) keeps the real search field and chips (they work on an empty list) instead of the design's skeletons for them. The schema's "E-mail inválido" stays (design: "Informe um e-mail válido.").
- 2026-10-21 — Access links are generated on demand from the student page (a token is shown once; the previous link stops working, which the sheet says before generating). The design's "Ela"/"ele" copy is neutralized with the first name.
- 2026-10-21 — After a delete or an ended relationship, the queries the still-mounted screen observes are marked stale with `refetchType: "none"`, never removed or refetched: a refetch would 403/404 and bounce the user a second time (the web's same rule). Ending a relationship returns to the roster (`router.dismissTo("/alunos")`) from wherever the student was opened. Review of #22.
- 2026-10-21 — The Progresso chart covers the last 8 *calendar* weeks (weeks without a record have no bar); the student's Feedbacks tab lists the newest 20. The student e-mail stays `textSecondary` (the design's tertiary fails AA for text).
- 2026-10-21 — The plan ⋮ menu has Editar / Excluir only (the design's "Link de acesso" there was copied from the student's menu). Weekday chips use the web's "SAB" (design: "SÁB").
- 2026-10-21 — Every form submit is single-flight (`useSingleFlight` around `handleSubmit`): an `isPending` check alone lets two taps in one frame through, which on create makes duplicates. Review of #23.
- 2026-10-21 — Plan copy kept from the web, not the design: "Aluno:" in the description (neutral), the end-date error "O plano precisa terminar depois do dia em que começa". "Treinos da semana" has no "Ver todos" (the week is the whole list). Plan periods carry both years when a plan crosses one.
