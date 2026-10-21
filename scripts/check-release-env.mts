/**
 * Fails an EAS build whose environment would ship a development backend: the same rules
 * `src/lib/env.ts` applies on the device at launch (https, no local hosts), checked before the
 * build instead of crashing the installed app. Runs as `eas-build-post-install`. Only the
 * `development` profile is exempt: it builds a dev client (`developmentClient: true`), where
 * `__DEV__` is true and `env.ts` applies the development rules too. Any other profile name gets the
 * release rules. Locally: `EAS_BUILD_PROFILE=production npm run env:check`.
 */
const profile = process.env.EAS_BUILD_PROFILE ?? "development";
// `env.ts` also parses at import with React Native's `__DEV__`: let that one pass (development
// rules) and apply the release rules explicitly below.
(globalThis as { __DEV__?: boolean }).__DEV__ = true;
const { parseEnv } = await import("../src/lib/env");

try {
  const env = parseEnv(process.env, { release: profile !== "development" });
  console.log(`Environment OK for the ${profile} profile (BFF ${env.EXPO_PUBLIC_BFF_URL}).`);
} catch (error) {
  console.error(`Invalid environment for the ${profile} profile:\n${String(error)}`);
  process.exit(1);
}
