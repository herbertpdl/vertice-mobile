/**
 * Generates Expo Router's typed routes (`.expo/types/router.d.ts`, git-ignored) so `npm run
 * typecheck` checks every `href` and `router.push` target. Expo writes them when the dev server
 * starts and has no standalone command, so this starts it, waits for the file to be written in
 * full (its size stable across two polls) and stops it.
 */
import { spawn } from "node:child_process";
import { existsSync, rmSync, statSync } from "node:fs";
import { setTimeout as sleep } from "node:timers/promises";

const TYPES = ".expo/types/router.d.ts";
const TIMEOUT_MS = 120_000;
const POLL_MS = 500;

rmSync(TYPES, { force: true });
const server = spawn("npx", ["expo", "start", "--port", "8079"], {
  env: { ...process.env, CI: "1", EXPO_NO_TELEMETRY: "1" },
  stdio: "ignore",
  detached: true,
});
let failed: Error | null = null;
server.on("error", (error) => {
  failed = error;
});

function size() {
  return existsSync(TYPES) ? statSync(TYPES).size : -1;
}

const started = Date.now();
let last = -1;
while (failed === null && Date.now() - started < TIMEOUT_MS) {
  await sleep(POLL_MS);
  const current = size();
  if (current > 0 && current === last) break;
  last = current;
}

// The whole process group: `npx` spawns the CLI, which spawns Metro. Escalate if it lingers.
async function stop() {
  if (server.pid === undefined || server.exitCode !== null) return;
  try {
    process.kill(-server.pid, "SIGTERM");
    await sleep(5000);
    if (server.exitCode === null && server.signalCode === null) process.kill(-server.pid, "SIGKILL");
  } catch {
    // Already gone.
  }
}
await stop();

if (failed !== null || size() <= 0) {
  console.error(failed ?? `No ${TYPES} after ${TIMEOUT_MS / 1000}s.`);
  process.exit(1);
}
console.log(`Generated ${TYPES}.`);
process.exit(0);
