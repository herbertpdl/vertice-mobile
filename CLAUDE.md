# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Project status

Vertice Mobile is the **trainer app** being built from the pen.dev mobile designs: Expo (React
Native) + TypeScript + Expo Router, with the design-system kit, API client and auth in place and
the screens landing PR by PR. It
serves both iOS and Android from one codebase, alongside the sibling repos
[`vertice-web-react`](../vertice-web-react) (Next.js web app), [`vertice-bff`](../vertice-bff)
(REST API), [`vertice-api`](../vertice-api) (Spring Boot / gRPC), and
[`vertice-local`](../vertice-local) (Docker Compose for running api+bff locally).

**The implementation plan for the trainer app — component library and screens, split into
stacked PRs — is [`docs/specs/mobile-app/spec.md`](docs/specs/mobile-app/spec.md).** Read it
before building any UI — start at its **§0 Handoff** — and update its checklists, PR
log and decisions log as you go.

## Commands

```bash
npm start          # Metro dev server — press i/a/w or scan the QR code with Expo Go
npm run ios        # start + open iOS simulator (needs Xcode + CocoaPods)
npm run android    # start + open Android emulator (needs Android Studio)
npm run web        # start + open in a browser (react-native-web)
npm run typecheck  # tsc --noEmit
npm run lint       # ESLint (eslint-config-expo)
npm run api:types  # regenerate src/lib/api/schema.ts from vertice-bff's OpenAPI document
npm run tokens:check # src/theme/tokens.ts vs vertice-web-react's globals.css at src/theme/.web-ref (-- --local for a sibling checkout)
npm test           # jest-expo + @testing-library/react-native (tests next to the code, *.test.ts[x])
```

CI (`.github/workflows/ci.yml`, job `build-and-test`) runs `npm ci`, `api:types -- --check`,
`tokens:check`, `typecheck`, `lint -- --max-warnings 0`, `npm test` and `npx expo install --check` on every PR and push to
`main`; keep all of them clean (warnings fail lint). `npx expo-doctor` and `npm audit --omit=dev
--audit-level=high` also run but are non-blocking — expo-doctor because `npx` always resolves the
latest release and >= 1.21 flags `ios.icon` (a valid Icon Composer `.icon` directory) as a config
schema error, `npm audit` until the transitive Expo/Metro advisories are dealt with (audit plan
P2-05). When bumping Expo packages, use `npx expo install <pkg>` / `npx expo install --fix` so the
drift check stays green.

## Architecture

- **Expo Router, `src/app/`** — file-based routing, same mental model as `vertice-web-react`'s
  Next.js App Router. `src/app/_layout.tsx` is the root layout (wraps the app in
  `QueryClientProvider` and renders the route `Stack`); route files under `src/app/` should stay
  thin (screens + layouts only), with everything else (`lib/`, `components/`, `hooks/`) living
  alongside it under `src/`.
- **Screens**: route files under `src/app/` stay thin (`export default LoginScreen`); the screen
  lives in `src/screens/<area>/<Name>Screen.tsx` with its test next to it. Routes: `(app)/` is
  everything behind the session (`Stack.Protected` in the root layout; `(app)/_layout.tsx` gates on
  `useSessionGate`: loading → non-trainer notice → Terms consent → app), `login` and `cadastro`
  are the signed-out screens, `(dev)/kit` the kit gallery. Forms bind fields with
  `FormTextField` (`src/components/form/`). Screen tests use `src/test/` — `mockBff({ "POST
  /api/…": body })` replaces `fetch` with a route table and `renderScreen` adds the providers.
- **Path alias**: `@/*` maps to `src/*`, `@/assets/*` maps to `assets/*` (`tsconfig.json`).
- **No server-side layer.** Unlike `vertice-web-react`, which proxies through its own `/api`
  routes so `BFF_URL` stays server-only, this app has no backend of its own — it calls
  `vertice-bff`'s REST API directly from the device via `src/lib/api/client.ts`'s `apiFetch`, so
  the BFF URL is `EXPO_PUBLIC_BFF_URL` (bundled into the client; see `.env.example`). On a physical
  device, `localhost` refers to the device itself, not your machine — use your machine's LAN IP
  when testing on hardware instead of a simulator/emulator.
- **`src/lib/env.ts`** parses `process.env` once through a Zod schema at import time (`env`),
  mirroring `vertice-bff`'s `src/config/env.ts` pattern — don't read `process.env` directly
  elsewhere. Expo only inlines env vars prefixed `EXPO_PUBLIC_` into the client bundle; anything
  without that prefix is `undefined` at runtime here.
- **`src/lib/api/client.ts`** exports `apiFetch<T>(path, init?)` and `apiClient`
  (`get/post/put/patch/delete`, the web's shape) against `EXPO_PUBLIC_BFF_URL`, plus `ApiError`
  (`code` — any string, since a BFF deployed ahead of an installed build can send a code this copy
  doesn't know; `status`, `details` on `VALIDATION_ERROR`, `retryAfter` on 429). Every failure is
  an `ApiError`: no network → `NETWORK_ERROR`, 15 s without an answer → `TIMEOUT` (status 0).
  `path` is the route exactly as the OpenAPI document names it, **`/api` prefix included**
  (`/api/clients/7`). Calls carry the session's bearer token, and a 401 on one signs out; the public
  routes (login, register, legal versions, password setup) pass `{ auth: false }` so a 401 there
  stays a "wrong credentials" error. One module per BFF resource in `src/lib/api/*.ts` (ported
  from the web; add endpoints there, never inline `apiFetch` in a screen), wire types aliased in
  `types.ts`, pt-BR copy per error `code` in `errorMessages.ts` (`apiErrorMessage`, never
  `error.message`).
- **Auth, `src/lib/auth/`** — `AuthProvider` (root layout) restores the token from
  `expo-secure-store` (Keychain/Keystore, `WHEN_UNLOCKED_THIS_DEVICE_ONLY`; never AsyncStorage)
  while the splash stays up, hands it to `apiFetch`, and signs out on a 401 (`sessionExpired` tells
  the login screen why). Only the token is persisted; who the user is comes from `useMe()`
  (`GET /api/auth/me`). Tokens last 8 h with no refresh token (a BFF decision, audit P2-05).
- **`src/lib/query-client.ts`**: 30 s `staleTime`, no retries on a 4xx (`shouldRetry`), refetch on
  app foreground (`focusManager` ← `AppState`) and pause offline (`onlineManager` ← NetInfo).
- **Dates**: `src/lib/{format,calendar,plans}.ts` are ports of the web's, with its rules
  (instants in `America/Sao_Paulo`, business dates `yyyy-MM-dd` never through local `Date`);
  `npm run test:hostile-tz` runs them at UTC+14 and UTC−10.
- **Validation**: `src/lib/validation/*` are the web's Zod schemas and bounds (same pt-BR
  messages); `contract.test.ts` ties the form enums to the generated ones at typecheck.
- **`src/lib/api/schema.ts` is generated — never edit it.** `npm run api:types` regenerates it
  (`scripts/sync-api-types.mts`, run through `tsx`, so `npm run typecheck` covers it)
  with `openapi-typescript` (pinned exactly) from `vertice-bff`'s `docs/openapi.json` at the
  commit pinned in `src/lib/api/.bff-ref`, the same way `vertice-bff` pins `vertice-api`'s protos
  in `protos/.api-ref`. `-- --check` changes nothing and fails when the committed file is stale
  (CI runs it); `-- --local[=PATH]` reads `../vertice-bff/docs/openapi.json` from a sibling
  checkout's working tree, for a spec change that isn't merged yet. To adopt a contract change:
  merge it in `vertice-bff`, put the merge SHA in `.bff-ref`, run `npm run api:types`, commit
  both. Don't hand-write transport types (XREPO-013) — alias the generated ones
  (`components["schemas"]["Me"]`).
- **`src/lib/labels.ts`** holds this app's pt-BR labels for the contract's enums (days, plan
  levels, set strategies, roles), keyed by the generated enums so a renamed member fails
  typecheck. Labels stay hand-written and per app: don't import `vertice-web-react`'s, and keep
  them in this one file.
- **Forms**: `react-hook-form` + `@hookform/resolvers` + `zod`, as on the web. Read values with
  `useWatch`, never `watch()` (it makes the React Compiler skip the component).
- **Design system (`src/theme/`, `src/components/ui/`)** — the app is dark-only and styled with
  `StyleSheet` + typed tokens; never hardcode a color, spacing, radius or font size. `tokens.ts`
  mirrors vertice-web-react's `src/app/globals.css` 1:1 (`--color-surface-hover` →
  `colors.surfaceHover`, `--space-4` → `space[4]`) and `npm run tokens:check` enforces it against
  the pinned `src/theme/.web-ref`; mobile-only sizes live in `mobile.ts`. Text goes through the
  `Text` component (`variant` = a role of the pen.dev mobile type scale in `typography.ts`):
  **a font weight is a font family on React Native, so never set `fontWeight`** — `Text`'s
  `weight` prop picks the family. Fonts (Inter, Space Grotesk) load in the root layout via
  `useAppFonts`, which holds the splash until they're ready. Kit components are generated from the
  pen.dev mobile library ("DS - Mobile Components", `M *` components) — one folder per component
  (`<Name>/<Name>.tsx`, `index.ts`, `<Name>.test.tsx`), imported through the folder index.
- **Icons**: `lucide-react-native` (+ `react-native-svg` peer dep) mirrors `vertice-web-react`'s
  use of `lucide-react`, for icon parity between web and mobile.

## Running

Requires Node 22 (matching the other JS repos; pinned in `.nvmrc` and `engines`) and, for native builds, Xcode + CocoaPods (iOS) or
Android Studio (Android) — none of which are installed on a fresh machine by default. `npm start`
+ [Expo Go](https://expo.dev/go) sidesteps all of that for early development; switch to a
[development build](https://docs.expo.dev/develop/development-builds/introduction/) once the app
needs a native module Expo Go doesn't include.
