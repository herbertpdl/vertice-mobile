#!/usr/bin/env bash
# Publishes an EAS Update (OTA) to the `preview` or `production` channel, with the same
# EXPO_PUBLIC_* values the store build of that profile was made with.
#
#   scripts/publish-update.sh production "fix: rest timer label"
#   EXPO_PUBLIC_BFF_URL=https://… EXPO_PUBLIC_WEB_URL=https://… scripts/publish-update.sh preview "…"
#
# Why a script: `eas update` doesn't read `build.<profile>.env` from eas.json, so a bare
# `eas update` bundles without the backend URLs, `env.ts` falls back to localhost, and every
# installed release throws at launch. Here eas.json stays the only copy of the values:
#   1. the values come from `build.<channel>.env` in eas.json; a value eas.json doesn't have
#      (preview has no backend URL) must be exported by the caller, or the script stops;
#   2. `npm run env:check` applies the release rules (https, no local hosts) to them;
#   3. the script exports the bundle itself, with `.env` switched off (EXPO_NO_DOTENV), and
#      checks that each platform's bundle contains the BFF URL;
#   4. `eas update --skip-bundler` publishes that exact `dist/`.
#
# Why `--skip-bundler` with `--environment`: with `--environment`, eas-cli bundles with
# `{ ...process.env, ...EAS environment variables }` (eas-cli 27.11,
# build/utils/expoCli.js spawnExpoCommand), so the EAS environment would override the values
# checked here; without `--environment`, SDK 55+ makes eas-cli ask for one. Skipping eas-cli's
# bundler keeps the EAS environment out of the bundle altogether: `--environment` then only
# labels the update. EAS environment variables must not be relied on for updates.
#
# Run it directly, not as an npm script: package.json scripts are a fingerprint input, so adding
# one would change the runtime version. Only the owner publishes (see CLAUDE.md, "OTA updates").
set -euo pipefail

usage() {
  echo "usage: scripts/publish-update.sh <preview|production> \"<message>\"" >&2
  exit 64
}

[[ $# -eq 2 ]] || usage
channel=$1
message=$2
case "$channel" in
  preview | production) ;;
  *) usage ;;
esac
[[ -n "${message// /}" ]] || usage

cd "$(dirname "$0")/.."

# The values every bundle needs, and the optional one.
required=(EXPO_PUBLIC_BFF_URL EXPO_PUBLIC_WEB_URL EXPO_PUBLIC_APP_ENV)
optional=(EXPO_PUBLIC_SENTRY_DSN)

# `build.<channel>.env` from eas.json, as NAME=value lines (EXPO_PUBLIC_* only, single line).
eas_env=$(node -e '
  const profile = require("./eas.json").build[process.argv[1]];
  if (!profile) { console.error(`eas.json has no build profile "${process.argv[1]}"`); process.exit(1); }
  for (const [name, value] of Object.entries(profile.env ?? {})) {
    if (!name.startsWith("EXPO_PUBLIC_")) continue;
    if (/[\r\n]/.test(value)) { console.error(`${name} in eas.json spans lines`); process.exit(1); }
    console.log(`${name}=${value}`);
  }
' "$channel")

from_eas_json() {
  local line
  while IFS= read -r line; do
    [[ "${line%%=*}" == "$1" ]] && { printf '%s' "${line#*=}"; return 0; }
  done <<<"$eas_env"
  return 1
}

for name in "${required[@]}" "${optional[@]}"; do
  shell_value=${!name-}
  if eas_value=$(from_eas_json "$name"); then
    if [[ -n "$shell_value" && "$shell_value" != "$eas_value" ]]; then
      echo "$name is exported as \"$shell_value\", but eas.json's $channel profile has \"$eas_value\"." >&2
      echo "The update must match the $channel build: unset it (eas.json wins) or change eas.json." >&2
      exit 1
    fi
    export "$name=$eas_value"
  elif [[ -n "$shell_value" ]]; then
    export "$name=$shell_value"
  elif [[ " ${required[*]} " == *" $name "* ]]; then
    echo "$name is not in eas.json's $channel profile and isn't exported." >&2
    echo "Export the value the $channel build was made with, e.g.:" >&2
    echo "  $name=https://… scripts/publish-update.sh $channel \"…\"" >&2
    exit 1
  fi
done

# Release rules (https, no local hosts) — the same check every EAS build runs.
EAS_BUILD_PROFILE=$channel npm run --silent env:check

# Bundle with exactly these values: no .env, no Metro cache from an earlier run.
export EXPO_NO_DOTENV=1
rm -rf dist
npx expo export --output-dir dist --dump-sourcemap --dump-assetmap \
  --platform ios --platform android --clear

for platform in ios android; do
  shopt -s nullglob
  bundles=(dist/_expo/static/js/"$platform"/*.hbc dist/_expo/static/js/"$platform"/*.js)
  shopt -u nullglob
  if [[ ${#bundles[@]} -eq 0 ]] || ! grep -aqF "$EXPO_PUBLIC_BFF_URL" "${bundles[@]}"; then
    echo "The $platform bundle doesn't contain $EXPO_PUBLIC_BFF_URL: not publishing." >&2
    exit 1
  fi
done

echo "Publishing to $channel (BFF $EXPO_PUBLIC_BFF_URL, web $EXPO_PUBLIC_WEB_URL)."
npx eas-cli update --channel "$channel" --environment "$channel" --skip-bundler --message "$message"
