# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Project status

Vertice Mobile is a **bootstrapped skeleton**: Expo (React Native) + TypeScript + Expo Router,
with React Query and an API client helper wired up, but no product screens implemented yet. It
serves both iOS and Android from one codebase, alongside the sibling repos
[`vertice-web-react`](../vertice-web-react) (Next.js web app), [`vertice-bff`](../vertice-bff)
(REST API), [`vertice-api`](../vertice-api) (Spring Boot / gRPC), and
[`vertice-local`](../vertice-local) (Docker Compose for running api+bff locally).

## Commands

```bash
npm start          # Metro dev server — press i/a/w or scan the QR code with Expo Go
npm run ios        # start + open iOS simulator (needs Xcode + CocoaPods)
npm run android    # start + open Android emulator (needs Android Studio)
npm run web        # start + open in a browser (react-native-web)
npm run typecheck  # tsc --noEmit
npm run lint       # ESLint (eslint-config-expo)
npm run api:types  # regenerate src/lib/api/schema.ts from vertice-bff's OpenAPI document
```

There is no test suite configured in this repository yet.

CI (`.github/workflows/ci.yml`, job `build-and-test`) runs `npm ci`, `api:types -- --check`,
`typecheck`, `lint -- --max-warnings 0` and `npx expo install --check` on every PR and push to
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
- **`src/lib/api/client.ts`** exports `apiFetch<T>(path, init?)`, a thin `fetch` wrapper against
  `EXPO_PUBLIC_BFF_URL`, and `ApiError` (`status`, optional `code` typed as the contract's
  `ErrorCode`, and `details` — Zod's flattened field errors on `VALIDATION_ERROR`), matching the
  `{ error: { code, message, details } }` shape `vertice-bff`'s error handler returns. `path` is
  the route exactly as the OpenAPI document names it, **`/api` prefix included**
  (`/api/clients/7`), since that is what the generated `paths` keys are; `/health` has no prefix.
  `T` comes from `ApiResult<path, method>` (and request bodies from `ApiBody<path, method>`), so
  `apiFetch<ApiResult<"/api/auth/me", "get">>("/api/auth/me")` breaks at `npm run typecheck` if
  that response changes upstream. There's no auth/token handling yet — `vertice-bff` issues JWTs
  (see its `CLAUDE.md`); when wiring up auth here, tokens should go in `expo-secure-store` (not
  `AsyncStorage`), not committed yet since nothing here needs them.
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
- **`src/lib/query-client.ts`** exports a single shared `QueryClient` instance, provided at the
  root in `_layout.tsx` — data-fetching hooks should use React Query (`useQuery`/`useMutation`)
  against `apiFetch`, matching `vertice-web-react`'s use of `@tanstack/react-query`.
- **Forms**: `react-hook-form` + `@hookform/resolvers` + `zod` are installed to match
  `vertice-web-react`'s form stack, not yet used anywhere.
- **Icons**: `lucide-react-native` (+ `react-native-svg` peer dep) mirrors `vertice-web-react`'s
  use of `lucide-react`, for icon parity between web and mobile.

## Running

Requires Node 22 (matching the other JS repos; pinned in `.nvmrc` and `engines`) and, for native builds, Xcode + CocoaPods (iOS) or
Android Studio (Android) — none of which are installed on a fresh machine by default. `npm start`
+ [Expo Go](https://expo.dev/go) sidesteps all of that for early development; switch to a
[development build](https://docs.expo.dev/develop/development-builds/introduction/) once the app
needs a native module Expo Go doesn't include.
