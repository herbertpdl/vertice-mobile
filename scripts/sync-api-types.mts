/**
 * Keeps `src/lib/api/schema.ts` equal to the TypeScript types generated from vertice-bff's
 * OpenAPI document (`docs/openapi.json`) at the commit pinned in `src/lib/api/.bff-ref`
 * (XREPO-005, XREPO-013). Mirrors vertice-bff's own `npm run sync:protos`, which pins
 * vertice-api the same way.
 *
 *   npm run api:types                  # fetch the pinned commit's spec, rewrite schema.ts
 *   npm run api:types -- --check       # same fetch, change nothing, exit 1 if schema.ts is stale
 *   npm run api:types -- --local       # read ../vertice-bff/docs/openapi.json instead
 *   npm run api:types -- --local=PATH  # ...from another vertice-bff checkout
 *
 * Bumping the pin: merge the route or schema change in vertice-bff (its own CI keeps
 * `docs/openapi.json` current), put the merge commit's full SHA in `src/lib/api/.bff-ref`, run
 * `npm run api:types`, and commit both. CI runs `--check`.
 *
 * `--local` reads that checkout's working tree, not the pinned commit, so its output can differ
 * from what `--check` expects; it is a dev convenience for a spec change that is not merged yet.
 * vertice-bff is public, so the remote mode needs no token (set GITHUB_TOKEN to lift rate limits).
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

import openapiTS, { astToString, type OpenAPI3 } from "openapi-typescript";

const REPO = "herbertpdl/vertice-bff";
const SPEC_PATH = "docs/openapi.json";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const refFile = path.join(root, "src", "lib", "api", ".bff-ref");
const outFile = path.join(root, "src", "lib", "api", "schema.ts");

function fail(message: string): never {
  process.stderr.write(`api:types: ${message}\n`);
  process.exit(2);
}

/** The pinned SHA: the first non-blank, non-`#` line of `.bff-ref`, which must be 40 hex chars. */
function parsePin(content: string): string {
  const line = content
    .split("\n")
    .map((l) => l.trim())
    .find((l) => l !== "" && !l.startsWith("#"));
  if (!line || !/^[0-9a-f]{40}$/.test(line)) {
    throw new Error(
      "src/lib/api/.bff-ref must hold a full 40-character lowercase commit SHA of vertice-bff",
    );
  }
  return line;
}

/** The pinned `docs/openapi.json`, or the one in a local vertice-bff checkout's working tree. */
async function readSpec(sha: string, local: string | null): Promise<OpenAPI3> {
  const source = local === null
    ? `https://raw.githubusercontent.com/${REPO}/${sha}/${SPEC_PATH}`
    : path.join(local, SPEC_PATH);

  let raw: string;
  if (local === null) {
    const headers: Record<string, string> = { "User-Agent": "vertice-mobile-sync-api-types" };
    if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
    const res = await fetch(source, { headers });
    if (!res.ok) fail(`could not fetch ${REPO}@${sha}:${SPEC_PATH}: HTTP ${res.status}`);
    raw = await res.text();
  } else {
    try {
      raw = readFileSync(source, "utf8");
    } catch {
      fail(`could not read ${source}; clone vertice-bff next to this repo or pass --local=PATH`);
    }
  }

  let spec: OpenAPI3;
  try {
    spec = JSON.parse(raw) as OpenAPI3;
  } catch {
    return fail(`${source} is not valid JSON`);
  }
  if (!spec.openapi?.startsWith("3.") || Object.keys(spec.paths ?? {}).length === 0) {
    fail(`${source} is not an OpenAPI 3 document with paths`);
  }
  return spec;
}

/** The full contents `src/lib/api/schema.ts` should have for `spec` at `sha`. */
async function generate(spec: OpenAPI3, sha: string): Promise<string> {
  const generator = createRequire(import.meta.url)("openapi-typescript/package.json") as {
    version: string;
  };
  const banner = [
    "/**",
    " * Generated from vertice-bff's OpenAPI document. Do not edit by hand.",
    ` * Source:    ${REPO}@${sha}:${SPEC_PATH}`,
    ` * Spec:      ${spec.info.title} ${spec.info.version} (OpenAPI ${spec.openapi})`,
    ` * Generator: openapi-typescript@${generator.version}`,
    " *",
    " * Regenerate with `npm run api:types` after bumping src/lib/api/.bff-ref; CI fails when this",
    " * file is stale. Hand-written types (pt-BR labels, screen state) live elsewhere.",
    " */",
    "",
  ].join("\n");
  const types = astToString(await openapiTS(spec, { silent: true }));
  return `${banner}\n${types}`;
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const check = args.includes("--check");
  const localArg = args.find((a) => a === "--local" || a.startsWith("--local="));
  const unknown = args.filter((a) => a !== "--check" && a !== localArg);
  if (unknown.length > 0) {
    fail(
      `unknown argument(s): ${unknown.join(" ")}\n` +
        "Usage: sync-api-types [--check] [--local[=PATH]]",
    );
  }
  const local =
    localArg === undefined
      ? null
      : path.resolve(root, localArg.split("=")[1] ?? "../vertice-bff");

  let sha: string;
  try {
    sha = parsePin(readFileSync(refFile, "utf8"));
  } catch (error) {
    fail(error instanceof Error ? error.message : String(error));
  }

  if (local !== null) {
    process.stdout.write(
      `Reading ${path.join(local, SPEC_PATH)} (working tree, not ${sha.slice(0, 10)})\n`,
    );
  }

  const next = await generate(await readSpec(sha, local), sha);
  const current = (() => {
    try {
      return readFileSync(outFile, "utf8");
    } catch {
      return null;
    }
  })();

  if (check) {
    if (current === next) {
      process.stdout.write(`src/lib/api/schema.ts matches ${REPO}@${sha.slice(0, 10)}\n`);
      return;
    }
    process.stderr.write(
      `src/lib/api/schema.ts is ${current === null ? "missing" : "out of date"} for ${REPO}@${sha}.\n` +
        'Run "npm run api:types" and commit the result (or fix src/lib/api/.bff-ref if the pin is wrong).\n',
    );
    process.exit(1);
  }

  if (current === next) {
    process.stdout.write(`src/lib/api/schema.ts already matches ${REPO}@${sha.slice(0, 10)}\n`);
    return;
  }
  mkdirSync(path.dirname(outFile), { recursive: true });
  writeFileSync(outFile, next);
  process.stdout.write(
    `${current === null ? "Wrote" : "Updated"} src/lib/api/schema.ts from ${REPO}@${sha.slice(0, 10)}\n`,
  );
}

if (process.argv[1] === fileURLToPath(import.meta.url)) await main();
