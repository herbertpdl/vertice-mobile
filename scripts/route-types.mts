/**
 * Generates Expo Router's typed routes (`.expo/types/router.d.ts`, git-ignored) so `npm run
 * typecheck` checks every `href` and `router.push` target. Expo writes them when the dev server
 * starts and has no standalone command, so this starts it, waits for the file and stops it.
 */
import { spawn } from "node:child_process";
import { existsSync, rmSync } from "node:fs";
import { setTimeout as sleep } from "node:timers/promises";

const TYPES = ".expo/types/router.d.ts";
const TIMEOUT_MS = 120_000;

rmSync(TYPES, { force: true });
const server = spawn("npx", ["expo", "start", "--port", "8079"], {
  env: { ...process.env, CI: "1", EXPO_NO_TELEMETRY: "1" },
  stdio: "ignore",
  detached: true,
});

const started = Date.now();
while (!existsSync(TYPES) && Date.now() - started < TIMEOUT_MS) await sleep(500);
// The whole process group: `npx` spawns the CLI, which spawns Metro.
process.kill(-server.pid!, "SIGTERM");

if (!existsSync(TYPES)) {
  console.error(`No ${TYPES} after ${TIMEOUT_MS / 1000}s.`);
  process.exit(1);
}
console.log(`Generated ${TYPES}.`);
