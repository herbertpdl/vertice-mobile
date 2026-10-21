# vertice-mobile

React Native (Expo) app for Vertice, targeting iOS and Android from a single codebase. Talks
directly to [`vertice-bff`](../vertice-bff)'s REST API — there is no server-side layer in this
app, unlike [`vertice-web-react`](../vertice-web-react).

## Status

Bootstrapped skeleton: Expo Router + TypeScript, with React Query and a thin `apiFetch` helper
wired up, but no product screens implemented yet. The request and response types come from
[`vertice-bff`](../vertice-bff)'s OpenAPI document — see "The API contract" below.

## Getting started

```bash
nvm use                 # Node 22, from .nvmrc
cp .env.example .env   # set EXPO_PUBLIC_BFF_URL if not using the default
npm install
npm start               # then press i / a / w, or scan the QR code with Expo Go
```

Running natively (`npm run ios` / `npm run android`) requires Xcode + CocoaPods (iOS) or Android
Studio (Android) installed locally; `npm start` + Expo Go avoids that for early development.

## Store readiness

Checklist to clear before the first TestFlight / Play internal build. Apple guideline 5.1.1(v)
and Google Play both require in-app account deletion for apps that create accounts, and both
need a privacy-policy URL and accurate privacy labels. The backend pieces already exist; each
item below is about wiring them into this app.

- [ ] **In-app account deletion** — a "Excluir conta" screen that calls `DELETE /api/auth/me`
  with `{ password }` (re-auth), handles `400 INVALID_CURRENT_PASSWORD`, `409 ACTIVE_CLIENTS`
  and `429`, and signs out on `204`. Backed by vertice-api `DeleteAccount` (anonymises the
  account and deletes health-adjacent data).
- [ ] **Data export** — "Exportar meus dados" calling `GET /api/auth/me/export` (LGPD art. 18 II
  and V); handle `413 TOO_LARGE` and the 3-per-hour `429 RATE_LIMITED`.
- [ ] **Privacy policy and terms links** — on registration/first access and in settings, pointing
  at the web app's `/privacidade` and `/termos` (drafts pending legal review).
- [ ] **Consent at first access** — gate the client app on TERMS and HEALTH_DATA consent before
  any workout is recorded: compare `GET /api/auth/me` `consent` with `GET /api/legal/versions`
  and record with `POST /api/auth/me/consent`.
- [ ] **App Store privacy nutrition label and Play Data safety form** — fill them in from the
  data the BFF actually returns, using `vertice-api/docs/data-inventory.md` (account data, CPF,
  training loads, feedback, session logs; no tracking, no third-party sharing today).
- [ ] **iOS privacy manifest** (`ios.privacyManifests` in `app.json`) for any native module that
  needs one, plus `ios.infoPlist` usage strings for any permission the app starts requesting.
- [ ] **Deep links carrying tokens** (e.g. password setup) use Universal Links / App Links rather
  than the custom URL scheme (see the audit's SEC-MOB-003).

## Commands

```bash
npm start        # start the Metro dev server (Expo Go / dev client)
npm run ios      # start and open in the iOS simulator
npm run android  # start and open in the Android emulator
npm run web      # start and open in a browser (react-native-web)
npm run typecheck # tsc --noEmit
npm run lint     # ESLint (eslint-config-expo)
npm run api:types # regenerate src/lib/api/schema.ts from vertice-bff's OpenAPI document
npm run tokens:check # check src/theme/tokens.ts against vertice-web-react's design tokens
npm test         # unit and component tests (jest-expo)
```

## The API contract

`src/lib/api/schema.ts` is **generated** from [`vertice-bff`](../vertice-bff)'s
`docs/openapi.json` (itself generated from its route schemas) at the commit pinned in
`src/lib/api/.bff-ref`. Never edit it by hand:

```bash
npm run api:types                  # fetch the pinned commit's spec and rewrite schema.ts
npm run api:types -- --check       # change nothing; exit 1 if the committed file is stale (CI)
npm run api:types -- --local       # read ../vertice-bff/docs/openapi.json (unmerged spec changes)
```

To pick up a contract change: merge it in `vertice-bff`, put that merge commit's full 40-character
SHA in `src/lib/api/.bff-ref`, run `npm run api:types`, and commit both files. CI runs `--check`,
so a stale `schema.ts` fails the build. `vertice-bff` is public, so no token is needed (set
`GITHUB_TOKEN` only to lift GitHub's anonymous rate limit). The generator
(`openapi-typescript`) is pinned exactly, since its version decides the output.

What stays hand-written: this app's own types and its pt-BR labels for the contract's enums
(`src/lib/labels.ts`, keyed by the generated types so a renamed enum member fails `typecheck`).
Labels are per app — `vertice-web-react` keeps its own.

## CI

`.github/workflows/ci.yml` runs on every pull request and on pushes to `main`: `npm ci`,
`npm run api:types -- --check`, `npm run tokens:check`, `npm run typecheck`,
`npm run lint -- --max-warnings 0`, `npm test` and
`npx expo install --check`, plus two non-blocking steps — `npx expo-doctor` and `npm audit
--omit=dev --audit-level=high` (known transitive Expo/Metro advisories, tracked in the audit
plan's P2-05). Run the same commands locally before opening a PR. If `expo install --check`
reports version drift, `npx expo install --fix` realigns the Expo packages. `expo-doctor` is
advisory because `npx` always resolves its latest release, so an upstream change can break every
PR with no code change here — as >= 1.21 does today by rejecting `ios.icon`'s Icon Composer
`.icon` directory, which is valid for SDK 57.
Dependabot (`.github/dependabot.yml`) opens weekly npm and GitHub Actions update PRs.
