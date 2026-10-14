# vertice-mobile

React Native (Expo) app for Vertice, targeting iOS and Android from a single codebase. Talks
directly to [`vertice-bff`](../vertice-bff)'s REST API — there is no server-side layer in this
app, unlike [`vertice-web-react`](../vertice-web-react).

## Status

Bootstrapped skeleton: Expo Router + TypeScript, with React Query and a thin `apiFetch` helper
wired up, but no product screens implemented yet.

## Getting started

```bash
nvm use                 # Node 22, from .nvmrc
cp .env.example .env   # set EXPO_PUBLIC_BFF_URL if not using the default
npm install
npm start               # then press i / a / w, or scan the QR code with Expo Go
```

Running natively (`npm run ios` / `npm run android`) requires Xcode + CocoaPods (iOS) or Android
Studio (Android) installed locally; `npm start` + Expo Go avoids that for early development.

## Commands

```bash
npm start        # start the Metro dev server (Expo Go / dev client)
npm run ios      # start and open in the iOS simulator
npm run android  # start and open in the Android emulator
npm run web      # start and open in a browser (react-native-web)
npm run typecheck # tsc --noEmit
npm run lint     # ESLint (eslint-config-expo)
```

There is no test suite configured in this repository yet.

## CI

`.github/workflows/ci.yml` runs on every pull request and on pushes to `main`: `npm ci`,
`npm run typecheck`, `npm run lint -- --max-warnings 0` and `npx expo-doctor`, plus a
non-blocking `npm audit --omit=dev --audit-level=high` (known transitive Expo/Metro advisories,
tracked in the audit plan's P2-05). Run the same commands locally before opening a PR. If
`expo-doctor` reports version drift, `npx expo install --fix` realigns the Expo packages.
Dependabot (`.github/dependabot.yml`) opens weekly npm and GitHub Actions update PRs.
