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
log and decisions log as you go. The **client app** (the aluno's workout experience) has its own
plan, built on the same rules: [`docs/specs/client-workout-experience/spec.md`](docs/specs/client-workout-experience/spec.md)
(from the PRD in `docs/prds/client-workout-experience/prd.md`).

## Commands

```bash
npm start          # Metro dev server for an installed development build — press i / a / w
npm run ios        # expo run:ios — native build + install on the iOS simulator (see "Running")
npm run android    # expo run:android — native build + install on the Android emulator (JDK 17)
npm run web        # start + open in a browser (react-native-web)
npm run routes:types # generate Expo Router's typed routes (.expo/types) so typecheck checks every href
npm run typecheck  # tsc --noEmit
npm run lint       # ESLint (eslint-config-expo)
npm run api:types  # regenerate src/lib/api/schema.ts from vertice-bff's OpenAPI document
npm run tokens:check # src/theme/tokens.ts vs vertice-web-react's globals.css at src/theme/.web-ref (-- --local for a sibling checkout)
npm test           # jest-expo + @testing-library/react-native (tests next to the code, *.test.ts[x])
```

CI (`.github/workflows/ci.yml`, job `build-and-test`) runs `npm ci`, `api:types -- --check`,
`tokens:check`, `routes:types`, `typecheck`, `lint -- --max-warnings 0`, `npm test`,
`test:hostile-tz`, `npx expo install --check` and `npx expo-doctor` on every PR and push to
`main`; keep all of them clean (warnings fail lint). `npm audit --omit=dev --audit-level=high`
also runs but is non-blocking until the transitive Expo/Metro advisories are dealt with (audit
plan P2-05). When bumping Expo packages, use `npx expo install <pkg>` / `npx expo install --fix` so the
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
  while the splash stays up, hands it to `apiFetch`, and signs out on a 401 (`sessionEnded` tells
  the login screen why). Only the token and its renewal record (the BFF's `expiresAt` + when the
  device got it) are persisted; who the user is comes from `useMe()` (`GET /api/auth/me`).
  Sessions persist ([`docs/specs/mobile-persistent-session/spec.md`](docs/specs/mobile-persistent-session/spec.md)):
  `apiFetch` sends `X-Vertice-Client: mobile` on every request, so login/register issue a 90-day
  token, and `AuthProvider` renews it (`POST /api/auth/session/renew`) on launch, foreground and
  reconnect — at most daily, online only, single-flight. A token with no renewal record (an 8 h one
  from an older build) is never renewed; a 403 drops the record and keeps the
  session (only with the BFF's code: `SESSION_NOT_RENEWABLE`, `FORBIDDEN`, or a 404 `NOT_FOUND`); a 401 signs out as `expired`. Sign-out reasons: `user` ("Sair": clears drafts and the
  workout outbox), `expired` and `passwordChanged` (both keep them).
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
- **Builds and monitoring**: `eas.json` has `development` / `preview` / `production` profiles;
  each build runs `npm run env:check` (`eas-build-post-install`), which applies `env.ts`'s release
  rules (https, no local hosts) before building. The production service URLs are in `eas.json`
  (`EXPO_PUBLIC_BFF_URL=https://api.vertice.fit`, `EXPO_PUBLIC_WEB_URL=https://www.vertice.fit`):
  they ship inside every binary, so change them only with a migration plan for installed versions. Crash reporting is Sentry (`src/lib/monitoring.ts`),
  on only in release builds with `EXPO_PUBLIC_SENTRY_DSN`; reports never carry the app's data
  (no user, no payloads, no touch breadcrumbs, e-mails/CPFs/tokens scrubbed) — keep it that way.
  Source-map upload needs `SENTRY_ORG`, `SENTRY_PROJECT` and `SENTRY_AUTH_TOKEN` as EAS secrets.
  Until the Sentry project exists, the production profile sets `SENTRY_DISABLE_AUTO_UPLOAD=true` and has no
  DSN, so store builds report nothing; remove that flag when adding the DSN and the three secrets.
  `eas submit` targets the App Store Connect app `6830342756` (`submit.production.ios.ascAppId`).
  JavaScript fixes can also ship over the air: see "OTA updates (EAS Update)" below.
- **Local native module, `modules/backup-exclusion/`**: an iOS `ExpoAppDelegateSubscriber` that
  keeps `Documents/SQLite` (the workout outbox, `expo-sqlite/kv-store`) out of iCloud backups;
  Android has `allowBackup: false` in `app.json`. Autolinked from `modules/`; a change needs a
  native rebuild.
- **Rest countdown on the lock screen, `src/lib/workoutSession/restCountdown.ts`**: a Live Activity
  on iOS (`RestActivity.ios.tsx`, `expo-widgets`; a signed extension target,
  `com.vertice.mobile.ExpoWidgetsTarget`, with the App Group `group.com.vertice.mobile`) and an
  ongoing notification on Android (local module `modules/rest-countdown/`). `@expo/ui/swift-ui`
  throws as soon as it loads off iOS, so never import it outside a `.ios.tsx` file, and give a
  platform file's stub the same extension (Metro tries `.ts` before `.tsx`, so a `.ts` stub would
  win on iOS too, silently, with Jest still green). Android excludes
  `expo-widgets` from autolinking (`package.json`) but must keep `@expo/ui`: `expo-router` loads it at
  import time there, and removing it crashes on launch with every check green.
- **Keyboard**: `react-native-keyboard-controller` (`KeyboardProvider` at the root). `KeyboardBar`
  renders at the root and in `SheetModal`, since a `Modal` draws over the root. Scrolling `Screen`s
  use `KeyboardAwareScrollView`; sheets keep their `KeyboardAvoidingView` and a plain `ScrollView`
  with `useRevealFocusedInput`, because the aware view measures while the panel is still lifting.
  Jest can't see this: check keyboard layout changes on a simulator.
- **Icons**: `lucide-react-native` (+ `react-native-svg` peer dep) mirrors `vertice-web-react`'s
  use of `lucide-react`, for icon parity between web and mobile.

## OTA updates (EAS Update)

`expo-updates` is set up (`app.json` `updates.url` → `https://u.expo.dev/<projectId>`,
`runtimeVersion: { "policy": "fingerprint" }`; `eas.json` `channel` `preview` / `production`;
`development` has none, so a dev client loads updates only through its Extensions menu). The
behaviour is the default and has no custom UI: a release build checks on every launch
(`ON_LOAD`), starts at once with what it already has (`fallbackToCacheTimeout` 0), downloads a
new update in the background and runs it on the **next cold start**, so testing one takes up to
two kill-and-reopen cycles. If an update crashes at launch, expo-updates goes back to the previous
update or the embedded bundle on that device.

- **The first OTA-capable build is the next store build.** Installed builds (1.0, 1.1.0) don't
  include `expo-updates` and will never receive an update. `expo-updates` is a native module, so
  development builds also need a rebuild (`npm run ios` / `npm run android`).
- **Runtime version = fingerprint.** It's a hash of everything native: autolinked native code
  (`node_modules/*/ios|android`, `modules/`), config plugins (`expo-widgets` included), the app
  config, `eas.json` and the `package.json` scripts. An update only reaches builds with the same
  hash. The remote `buildNumber` / `versionCode` (`appVersionSource: remote`) aren't in it, but
  changing `version` in `app.json`, `eas.json` or an npm script is, so updates published after
  that change only reach the next build. Before publishing, compare
  `npx expo-updates runtimeversion:resolve --platform ios` (and `android`) with the runtime
  version on the build's expo.dev page.
- **Over the air:** JS/TS, styling, copy, bundled images, fonts and sounds, and the Live Activity
  layout (`RestActivity.ios.tsx` runs in the main app, which hands the layout to the widget
  extension at runtime; the extension has no `expo-updates` of its own). **Store build only:**
  adding, removing or upgrading a native package (any `npx expo install` of a native module, an
  Expo SDK bump), anything in `modules/`, permissions, `app.json` native fields (bundle id,
  icon, splash, plugins and their options, `ios`/`android`, `scheme`, the App Group, widget
  config), `eas.json` env values and the version. The fingerprint makes such an update
  incompatible (installed builds don't see it) rather than broken, but the fix still needs a build.
- **Publish** from `main` at the merged commit, preview first (a `preview` build, channel
  `preview`), then production. Only the owner does this:

  ```bash
  EXPO_PUBLIC_APP_ENV=production EXPO_PUBLIC_BFF_URL=https://api.vertice.fit \
  EXPO_PUBLIC_WEB_URL=https://www.vertice.fit EAS_BUILD_PROFILE=production npm run env:check
  EXPO_PUBLIC_APP_ENV=production EXPO_PUBLIC_BFF_URL=https://api.vertice.fit \
  EXPO_PUBLIC_WEB_URL=https://www.vertice.fit \
    npx eas-cli update --channel production --environment production --clear-cache --message "..."
  ```

  `build.<profile>.env` in `eas.json` **does not apply to `eas update`**. The bundle takes its
  `EXPO_PUBLIC_*` values from the shell, the EAS environment and `.env` (which points at
  `localhost`); with none of them `env.ts` falls back to `localhost` too, and a release throws
  at launch. Keep the inline values equal to
  `eas.json`'s production profile, or move them to the EAS `production` environment (then they
  apply to both). `--clear-cache` is needed: Metro's cache can keep the previous `EXPO_PUBLIC_*`
  values. For preview, use `--channel preview --environment preview` with the preview build's
  values.
- **Roll back:** `npx eas-cli update:republish --channel production` (choose the last good
  update group, or `--group <id>`) publishes it again as the newest update.
  `npx eas-cli update:roll-back-to-embedded --channel production --runtime-version <rv>` sends
  devices back to the bundle inside the store build. Either takes effect on each device's next
  launches, like any update.
- **Sentry:** an update's bundle needs its own source maps, or its stack traces stay minified.
  Nothing is automated (production has no DSN yet). When Sentry is on, after each `eas update`,
  upload the `dist/` it leaves behind:
  `SENTRY_AUTH_TOKEN=… SENTRY_ORG=… SENTRY_PROJECT=… npx --package=@sentry/react-native sentry-expo-upload-sourcemaps dist`
  (`npx @sentry/expo-upload-sourcemaps dist` from SDK 8.9). The maps match by debug ID
  (`getSentryExpoConfig` in `metro.config.js`), not by release. `eas update --upload-source-maps`
  sends them to EAS, not Sentry.
- **Cost** (expo.dev/pricing, checked 2026-11-20): the Free plan includes 1,000 monthly active
  users for updates, 100 GiB bandwidth and 20 GiB storage, with unlimited updates. It has
  no overage pricing: it's limited to those 1,000 MAU, so upgrade before the user base reaches it. Starter includes 3,000 MAU, then $0.005/MAU.

## Running

Requires Node 22 (pinned in `.nvmrc` and `engines`; if a Homebrew Node 25 is first on PATH and
broken, use `PATH=/opt/homebrew/opt/node@22/bin:$PATH`). The app uses native modules Expo Go
doesn't ship (`expo-dev-client`, Sentry), so it runs as a **development build**: `npm run ios` /
`npm run android` once (native build + install), then `npm start` and press `i` / `a`. Rebuild only
when native dependencies or `app.json` change. `android/` and `ios/` are generated (git-ignored).
The scripts set `SENTRY_DISABLE_AUTO_UPLOAD=true`: Sentry's source-map upload step runs in local
native builds too and fails without the Sentry secrets (calling `npx expo run:*` directly needs it set).

- **Backend**: `vertice-api` and `vertice-bff` on `localhost:8080` / `:3000` (see `vertice-local`);
  the web on `:5173` only serves the legal pages the app links to. `.env` points at `localhost`.
- **iOS**: Xcode as the active developer directory (`sudo xcode-select -s
  /Applications/Xcode.app/Contents/Developer`, `sudo xcodebuild -license accept`), an iOS
  simulator runtime (Xcode → Settings → Components) and CocoaPods (`brew install cocoapods`). The
  simulator's `localhost` is the Mac.
- **Android**: **JDK 17** (`brew install openjdk@17`;
  `JAVA_HOME=/opt/homebrew/opt/openjdk@17/libexec/openjdk.jdk/Contents/Home`). JDK 25 — Android
  Studio's bundled one included — fails `react-native-worklets:configureCMakeDebug` on its
  "restricted method" warning. Also `ANDROID_HOME=~/Library/Android/sdk` with `platform-tools`
  and `emulator` on PATH, and `adb reverse tcp:3000 tcp:3000` (+ `5173`, `8081`) after every
  emulator start, so the emulator's `localhost` reaches the Mac.
- On a physical device, put the Mac's LAN IP in `.env` instead of `localhost`.
