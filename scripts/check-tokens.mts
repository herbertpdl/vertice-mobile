/**
 * Checks that `src/theme/tokens.ts` holds exactly the design tokens vertice-web-react declares in
 * `src/app/globals.css` (`:root`'s `--color-*`, `--space-*`, `--radius-*`, `--text-*`) at the
 * commit pinned in `src/theme/.web-ref` — so web and mobile can't drift apart silently. Changes
 * nothing; exit 1 lists every missing, extra or different token. Parsing and diffing live in
 * `scripts/lib/tokens.ts` (unit tested).
 *
 *   npm run tokens:check                  # fetch the pinned commit's globals.css
 *   npm run tokens:check -- --check       # the same (accepted for symmetry with api:types)
 *   npm run tokens:check -- --local       # read ../vertice-web-react/src/app/globals.css instead
 *   npm run tokens:check -- --local=PATH  # ...from another vertice-web-react checkout
 *
 * Taking a token change: merge it in vertice-web-react (where it is regenerated from pen.dev),
 * put the merge commit's full SHA in `src/theme/.web-ref`, update `tokens.ts` until this passes,
 * and commit both. vertice-web-react is public, so no token is needed (GITHUB_TOKEN lifts rate
 * limits). Same pin-and-check shape as `npm run api:types`.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { diffTokens, mobileTokens, parseLocalArg, parseRootTokens } from "./lib/tokens";

const REPO = "herbertpdl/vertice-web-react";
const CSS_PATH = "src/app/globals.css";
const FETCH_TIMEOUT_MS = 30_000;
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const refFile = path.join(root, "src", "theme", ".web-ref");

function fail(message: string): never {
  process.stderr.write(`tokens:check: ${message}\n`);
  process.exit(2);
}

/** The pinned SHA: the first non-blank, non-`#` line of `.web-ref`, which must be 40 hex chars. */
function parsePin(content: string): string {
  const line = content
    .split("\n")
    .map((l) => l.trim())
    .find((l) => l !== "" && !l.startsWith("#"));
  if (!line || !/^[0-9a-f]{40}$/.test(line)) {
    fail("src/theme/.web-ref must hold a full 40-character lowercase commit SHA of vertice-web-react");
  }
  return line;
}

async function readCss(sha: string, local: string | null): Promise<string> {
  if (local !== null) {
    const file = path.join(local, CSS_PATH);
    try {
      return readFileSync(file, "utf8");
    } catch {
      return fail(`could not read ${file}; clone vertice-web-react next to this repo or pass --local=PATH`);
    }
  }
  const url = `https://raw.githubusercontent.com/${REPO}/${sha}/${CSS_PATH}`;
  const headers: Record<string, string> = { "User-Agent": "vertice-mobile-check-tokens" };
  if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  let res: Response;
  try {
    res = await fetch(url, { headers, signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
  } catch (error) {
    return fail(`could not fetch ${url}: ${error instanceof Error ? error.message : String(error)}`);
  }
  if (!res.ok) fail(`could not fetch ${REPO}@${sha}:${CSS_PATH}: HTTP ${res.status}`);
  return res.text();
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const localArg = args.find((a) => a === "--local" || a.startsWith("--local="));
  const unknown = args.filter((a) => a !== localArg && a !== "--check");
  if (unknown.length > 0) {
    fail(`unknown argument(s): ${unknown.join(" ")}\nUsage: check-tokens [--check] [--local[=PATH]]`);
  }
  let local: string | null;
  try {
    const value = parseLocalArg(localArg, "../vertice-web-react");
    local = value === null ? null : path.resolve(root, value);
  } catch (error) {
    fail(error instanceof Error ? error.message : String(error));
  }
  const sha = parsePin(readFileSync(refFile, "utf8"));

  let web: Map<string, string>;
  try {
    web = parseRootTokens(await readCss(sha, local));
  } catch (error) {
    fail(`${CSS_PATH}: ${error instanceof Error ? error.message : String(error)}`);
  }
  const problems = diffTokens(web, mobileTokens());

  const source = local === null ? `${REPO}@${sha.slice(0, 10)}` : path.join(local, CSS_PATH);
  if (problems.length === 0) {
    process.stdout.write(`src/theme/tokens.ts matches ${source} (${web.size} tokens)\n`);
    return;
  }
  process.stderr.write(
    `src/theme/tokens.ts does not match ${source}:\n${problems.map((p) => `  ${p}`).join("\n")}\n`,
  );
  process.exit(1);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) await main();
