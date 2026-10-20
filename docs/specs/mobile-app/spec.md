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
  same tokens, same pt-BR copy, same validation rules, same error-code copy.

## 1. Scope

**In scope (v1): the trainer app**, i.e. every mobile screen in the design file: auth (login,
cadastro, splash), the four tabs (Início, Alunos, Exercícios, Perfil), student detail (plans,
feedback, progress), plan detail and form, workout editor, exercise catalog/detail/form, profile
and account (edit, password, export, delete), consent gate.

**Out of scope (v1), tracked as follow-ups:**
- **Client (student) experience** (do a workout, record sets, feedback, progress) — audit item
  P2-13 recommends mobile be the client app; the design file only has trainer screens today. It
  needs a PRD (`prd-creator`) and designs first. Until then a `CLIENT` who logs in sees a
  "use the web / app do aluno em breve" screen and can sign out (see PR 6).
- Password reset ("Esqueceu a senha?") — **no BFF endpoint exists**; the link is removed from the
  design.
- Push notifications, offline editing, biometrics, tablets/landscape (portrait phone only).

## 2. Architecture decisions

| Topic | Decision |
|---|---|
| Styling | `StyleSheet.create` + typed tokens from `src/theme/` (no NativeWind/Tailwind). Never hardcode a color, spacing, radius or font size in a component: import from `@/theme`. |
| Tokens | `src/theme/tokens.ts` mirrors `vertice-web-react/src/app/globals.css` 1:1 (`--color-surface-hover` → `colors.surfaceHover`, `--space-4` → `space[4]`, `--radius-md` → `radius.md`, `--text-base` → `fontSize.base`). `npm run tokens:check` diffs them against the web file at the commit pinned in `src/theme/.web-ref` (`--local` reads `../vertice-web-react`), and CI runs it. Mobile-only values (tab bar blur tint, 52 px control height, 17 px nav title) live in `src/theme/mobile.ts`, named after the pen.dev component they come from. |
| Theme | Dark only (like the web). `app.json` `userInterfaceStyle: "dark"`, `expo-status-bar` `style="light"`, root view background `colors.bg`, splash/adaptive-icon background `colors.bg`. |
| Fonts | `@expo-google-fonts/inter` (400/500/600/700) and `@expo-google-fonts/space-grotesk` (500/600/700) through `useFonts`, splash held until loaded. **Weight is selected by family name, never `fontWeight`** (Android ignores `fontWeight` on custom fonts) — the `Text` primitive maps `weight` → family. |
| Components | `src/components/ui/<Name>/{<Name>.tsx,index.ts,<Name>.test.tsx}` (design-system kit, 1:1 with `M ` components), `src/components/domain/` (product pieces: rows, cards, sheets), `src/components/layout/` (Screen, NavBar, TabBar). Same one-folder-per-component rule as the web; import through the folder index. |
| Kit preview | A dev-only route `src/app/(dev)/kit.tsx` (guarded by `__DEV__`, not linked in release) renders every kit component in every state — the mobile stand-in for the web's Storybook. |
| Navigation | Expo Router. Groups: `(auth)` (login, cadastro), `(app)` behind the session with `(tabs)` (`index`=Início, `alunos`, `exercicios`, `perfil`) and stack screens pushed over the tabs. Guards with `Stack.Protected`. Bottom-sheet screens (Novo aluno, Editar aluno, Link de acesso, Editar perfil…) are routes with `presentation: "formSheet"` (native sheet, swipe to dismiss). In-form pickers (select, date, multi-select) use the kit `Sheet` (RN `Modal`). |
| Tab bar | Custom `tabBar` for `Tabs` rendering the `M Tab Bar` capsule (blur via `expo-blur`, safe-area bottom inset). |
| Status bar | The `M Status Bar` in the design is the device's; never draw it. Screens use safe-area insets (`react-native-safe-area-context`). |
| Server state | TanStack Query, query keys per resource (`["clients"]`, `["client", id, "overview"]`, `["trainingPlan", id]`, `["workout", id, "full"]`, `["exercises", filters]`, `["me"]`, `["dashboard"]`…); mutations invalidate by key (same convention as the web). `focusManager` on `AppState`, `onlineManager` on `@react-native-community/netinfo`, no retries on 4xx. Pull-to-refresh on every list. |
| API modules | `src/lib/api/<resource>.ts` thin typed wrappers over `apiFetch` (as the web's `src/lib/api/*.ts`), types aliased from the generated schema in `src/lib/api/types.ts`. Never inline `apiFetch` in a screen. |
| Auth | `POST /api/auth/login` returns `{ token, user }`. Token in `expo-secure-store` (never AsyncStorage), sent as `Authorization: Bearer`. `AuthProvider` (`src/lib/auth/`) restores it at boot (splash stays up), exposes `signIn/signOut`; any 401 from `apiFetch` signs out and clears the query cache. v1 is trainer-only: a `CLIENT` session lands on the "app do aluno" notice. |
| Consent | After sign-in, `GET /api/auth/me` `consent.termsVersion` vs the embedded `LEGAL_VERSIONS` (same as the web's `src/lib/legal/versions.ts`): outdated → blocking consent screen → `POST /api/auth/me/consent`. Fails closed (error + "Tentar novamente"). |
| Forms | `react-hook-form` + `zod` + `@hookform/resolvers`. Schemas ported from `vertice-web-react/src/lib/validation/*` (same bounds and pt-BR messages; `bounds.ts` copied, contract enums asserted against the generated types in a test). Read values with `useWatch`, never `watch()` (React Compiler). |
| Errors | `ApiError` keyed by `code`; pt-BR copy from `src/lib/api/errorMessages.ts` (port of the web's), never `error.message`. `FORBIDDEN`/`NOT_FOUND` on a detail screen → back to the list with a toast. |
| Dates | Port `vertice-web-react/src/lib/format.ts`, `plans.ts`, `calendar.ts` + tests. Instants formatted in `America/Sao_Paulo`; business dates (`yyyy-MM-dd`) never pass through `new Date()` in local time. **Verify Hermes honours `Intl.DateTimeFormat` `timeZone`** (test on device in PR 5; add `@formatjs/intl-datetimeformat` polyfill if not). Dashboard `completedToday` uses `completedAt` once the `.bff-ref` bump lands (see audit follow-ups). |
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
| `SelectField` + `SelectSheet` | M Select Field + M - Selecionar (Sheet) | single select |
| `MultiSelectField` + sheet | M - Grupos Musculares (Sheet) | chips of chosen values |
| `DateField` + `CalendarSheet` | M - Calendário (Sheet) | value is `yyyy-MM-dd` string only |
| `Checkbox` | M Checkbox | label can contain links |
| `Chip` | M Chip | selected = primary fill |
| `Badge` | M Badge (+ tones) | `tone`: neutral/success/warning/danger/info/primary |
| `Avatar` | M Avatar | initials, sizes 40/48/64 |
| `StatCard` | M Stat Card | label, value (heading), helper with tone |
| `SegmentedTabs` | M Segmented Tabs | optional count pill |
| `SectionHeader` | M Section Header | title + optional link |
| `TextLink` | M Text Link | |
| `Divider` | M Divider | plain / labelled ("ou") |
| `ProgressBar`, `WeekDots` | M Progress Bar, M Week Dots | |
| `Spinner`, `Skeleton` | M Spinner, M Skeleton* | `Skeleton.Line/Circle/Block` |
| `EmptyState`, `ErrorState` | M Empty State, M - Erro (Tela) | |
| `FormErrorBanner`, `OfflineBanner`, `Toast` | M Form Error Banner, M Offline Banner, M Toast | |
| `Sheet`, `ActionSheet`, `ConfirmDialog` | M Bottom Sheet, M Action Sheet, M Confirm Dialog | |
| `NavBar` (layout) | M Nav Bar | back, centered 17/600 title, action |
| `TabBar` (layout) | M Tab Bar | capsule, blur, active pill |
| `Screen` (layout) | — | safe area, bg, scroll/keyboard handling |

### 3.3 Screens (pen.dev `O3tUmW` → routes)

| Route | pen.dev screen(s) | Data |
|---|---|---|
| boot | M - Splash (Carregando) | session restore, fonts |
| `(auth)/login` | M - Login, M - Login (Erro de Validação) | `POST /api/auth/login` |
| `(auth)/cadastro` | M - Cadastro, M - Cadastro (Erros de Validação) | `GET /api/legal/versions`, `POST /api/auth/register` |
| `(app)/consentimento` | M - Termos (Consentimento) | `GET /api/auth/me`, `POST /api/auth/me/consent` |
| `(app)/(tabs)/index` | M - Dashboard, M - Dashboard (Loading) | `GET /api/dashboard` |
| `(app)/feedbacks` | M - Feedbacks | `GET /api/feedback` |
| `(app)/(tabs)/alunos` | M - Alunos, M - Alunos (Vazio), M - Alunos (Loading) | `GET /api/clients` |
| `(app)/alunos/novo` (sheet) | M - Novo Aluno (Sheet), M - Novo Aluno (Sucesso) | `POST /api/clients` |
| `(app)/alunos/[id]` | M - Detalhe do Aluno (+ Feedbacks, Progresso, Loading) | `GET /api/clients/{id}/overview`, `GET /api/training-plans?clientId=`, `GET /api/feedback`, `GET /api/exercises/{id}/progress?clientId=` |
| `(app)/alunos/[id]/editar` (sheet) | M - Editar Aluno (Sheet), M - Ações do Aluno | `PATCH /api/clients/{id}` |
| `(app)/alunos/[id]/acesso` (sheet) | M - Link de Acesso (Sheet) | `POST /api/clients/{id}/setup-token` |
| — (confirm) | M - Encerrar Vínculo (Confirm) | `DELETE /api/clients/{id}` |
| `(app)/planos/novo?clientId=`, `(app)/planos/[id]/editar` | M - Novo Plano, M - Calendário (Sheet) | `POST/PATCH /api/training-plans` |
| `(app)/planos/[id]` | M - Detalhe do Plano (+ Loading), M - Excluir Plano | `GET/DELETE /api/training-plans/{id}` |
| `(app)/planos/[planId]/treinos/novo?dayOfWeek=`, `(app)/treinos/[id]` | M - Editor de Treino (+ Novo, Salvando), M - Adicionar Exercício (Sheet), M - Descartar alterações, M - Excluir Treino | `GET /api/workouts/{id}/full`, `POST /api/training-plans/{planId}/workouts`, `PATCH /api/workouts/{id}` + `PUT /api/workouts/{id}/exercises`, `DELETE /api/workouts/{id}` |
| `(app)/(tabs)/exercicios` | M - Catálogo de Exercícios, M - Exercícios (Loading) | `GET /api/exercises?muscleGroupId=&q=`, `GET /api/muscle-groups` |
| `(app)/exercicios/[id]` | M - Detalhe do Exercício (+ padrão), M - Excluir Exercício | `GET/DELETE /api/exercises/{id}` |
| `(app)/exercicios/novo`, `(app)/exercicios/[id]/editar` | M - Novo Exercício, M - Grupos Musculares (Sheet) | `POST/PATCH /api/exercises` |
| `(app)/(tabs)/perfil` | M - Perfil | `GET /api/auth/me` |
| `(app)/perfil/editar` (sheet) | M - Editar Perfil (Sheet) | `PATCH /api/auth/me` |
| `(app)/perfil/senha` | M - Alterar Senha | `POST /api/auth/password` |
| `(app)/perfil/excluir` | M - Excluir Conta | `DELETE /api/auth/me` |
| — | export (action on Perfil) | `GET /api/auth/me/export` |
| legal | links | open web `/termos`, `/privacidade` with `expo-web-browser` |
| `(app)/aluno` | (role notice; built from `EmptyState`) | `CLIENT` role in v1 |

**Workout editor on mobile uses explicit save** (design: "Alterações não salvas" + Descartar /
Salvar treino), not the web's debounced autosave. New workout: one nested
`POST /training-plans/{planId}/workouts`. Existing: `PATCH /workouts/{id}` (name/day) then
`PUT /workouts/{id}/exercises` (whole tree). A 409 `PRECONDITION_FAILED` on the `PUT` (a client
already recorded data) falls back to per-item endpoints (`/workout-exercises`, `/exercise-sets`),
the same rule as the web's autosave engine — read
[the web spec](https://github.com/herbertpdl/vertice-web-react/blob/main/docs/specs/create-workout-with-exercises/spec.md)
before PR 11. Leaving with unsaved changes asks to discard (`usePreventRemove`).

### 3.4 Design agent report (componentization + screen changes)
_Pending — filled in when the design agent finishes. Lists every new `M ` component (node id,
states, values) and every new/changed screen._

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
- [ ] `src/theme/{tokens,mobile,typography,index}.ts`; `src/theme/.web-ref`; `scripts/check-tokens.mts` + `npm run tokens:check` (+ `--local`, `--check` semantics like `api:types`)
- [ ] Fonts via `@expo-google-fonts/*` + `useFonts`, splash held until loaded (`expo-splash-screen`)
- [ ] `app.json`: `userInterfaceStyle: "dark"`, splash/adaptive icon bg `#0A0E14`, `name: "Vertice"`
- [ ] `Text` primitive (+ test)
- [ ] `jest-expo` + `@testing-library/react-native`, `npm test`, CI step; tokens test
- [ ] `CLAUDE.md`/`README.md` updated (styling rules, test command)

### PR 3 — `feat/ui-kit-controls`: form & display primitives
- [ ] `Button`, `IconButton`, `TextField`, `TextArea`, `SearchField`, `Checkbox`, `Chip`, `Badge`, `Avatar`, `StatCard`, `Spinner`, `Skeleton`, `ProgressBar`, `WeekDots`, `Divider`, `TextLink`
- [ ] tests per component; `(dev)/kit` preview route
- [ ] Parity check against pen.dev nodes (values from `Get(node)`, not screenshots)

### PR 4 — `feat/ui-kit-layout`: layout, navigation & overlays
- [ ] `Screen`, `NavBar`, `TabBar`, `SectionHeader`, `SegmentedTabs`, `EmptyState`, `ErrorState`, `FormErrorBanner`, `OfflineBanner`, `Toast` (+ provider), `Sheet`, `ActionSheet`, `ConfirmDialog`, `SelectField`/`SelectSheet`, `MultiSelectField`, `DateField`/`CalendarSheet`
- [ ] tests; added to the kit preview

### PR 5 — `feat/api-auth-foundation` (audit P2-05)
- [ ] `apiFetch`: `Headers` merge, bearer token, 15 s timeout (AbortController), network/parse errors → `ApiError`, `Content-Type` only with a body, `retryAfter`; 401 → sign-out hook
- [ ] `env.ts`: URL validation; release builds require `https:` and refuse localhost
- [ ] `src/lib/auth/` (SecureStore storage, `AuthProvider`, `useSession`), `src/lib/api/{types,auth,errorMessages}.ts`
- [ ] query client: no 4xx retries, `focusManager`/`onlineManager`
- [ ] port `format.ts`/`plans.ts`/`calendar.ts`/validation + tests (Hermes `Intl` timeZone check)
- [ ] root `ErrorBoundary`
- [ ] tests for `apiFetch`, `env`, auth storage

### PR 6 — `feat/auth-screens`
- [ ] route groups + `Stack.Protected` guards; splash during restore
- [ ] Login (+ error banner/field errors, 401/429 copy), Cadastro (+ terms links, `acceptedTermsVersion`), consent gate, `CLIENT` notice
- [ ] tests (validation, submit, error mapping)

### PR 7 — `feat/home-dashboard`
- [ ] `(tabs)` layout with `TabBar`; Início (dashboard + skeleton + error/retry + pull to refresh); Feedbacks list

### PR 8 — `feat/students-list`
- [ ] Alunos (search, filter chips, `WeekDots`, empty/no-results, skeleton); Novo aluno sheet + success (share link)

### PR 9 — `feat/student-detail`
- [ ] Detalhe do aluno (overview stats, Planos/Feedbacks/Progresso tabs), action sheet, Editar aluno, Link de acesso, Encerrar vínculo

### PR 10 — `feat/training-plans`
- [ ] Detalhe do plano (week rows, rest days → add workout), Novo/Editar plano form with `DateField`, Excluir plano

### PR 11 — `feat/workout-editor`
- [ ] Editor (name, day select, exercise cards, set rows, notes), Adicionar exercício sheet, explicit save (POST / PATCH+PUT, 409 → per-item fallback), discard guard, Excluir treino; reducer/model unit tests

### PR 12 — `feat/exercises`
- [ ] Catálogo (search debounce, group chips), Detalhe (thumbnail → external video, starter read-only), Novo/Editar (multi-select groups), Excluir (in-use 409 copy)

### PR 13 — `feat/profile-account`
- [ ] Perfil, Editar perfil, Alterar senha, Exportar dados (file + share), Excluir conta (re-auth, `ACTIVE_CLIENTS`), Sair, legal links; README store checklist items ticked

### PR 14 — `chore/store-readiness`
- [ ] App identity (name, icons, splash), `eas.json` profiles, iOS privacy manifest, Android permissions audit, `expo-doctor` clean

### Later (separate PRDs)
- Client app (audit P2-13), password reset, push notifications, crash reporting (`@sentry/react-native`, P2-05 step 5).

## 5. Merge and deploy order
Mobile-only: no API or BFF change is required for v1 (every endpoint above already exists at the
pinned `.bff-ref`). If a PR bumps `.bff-ref` (e.g. to pick up `completedAt`), the BFF change must be
merged first. Rollback = revert the mobile PR; nothing server-side depends on it.

## PR log

| PR | Branch | GitHub | Status | Review |
|---|---|---|---|---|
| 1 | `docs/mobile-app-spec` | — | open | — |

## Decisions log
- 2026-10-20 — v1 is the **trainer** app because that is what the pen.dev mobile designs cover; the client app needs its own PRD + designs (audit P2-13).
- 2026-10-20 — Styling with `StyleSheet` + typed tokens instead of NativeWind: no extra build tooling on an Expo SDK pinned by `expo install --check`, and tokens stay greppable 1:1 with the web's CSS variables.
- 2026-10-20 — Workout editor uses explicit save on mobile (design), keeping the web's 409 → per-item fallback rule.
- 2026-10-20 — "Esqueceu a senha?" removed: no reset endpoint in the BFF.
- 2026-10-20 — PRs are stacked because merges are left to the owner.
