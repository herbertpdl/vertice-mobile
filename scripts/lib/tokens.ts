/**
 * The pure half of `npm run tokens:check` (`scripts/check-tokens.mts`), split out so it is unit
 * tested (`tokens.test.ts`): parsing the web's `globals.css` and diffing it against
 * `src/theme/tokens.ts`.
 */
import { colors, fontSize, radius, space } from "../../src/theme/tokens";

/** The custom-property prefixes that are design tokens (everything else in the CSS is ignored). */
export const TOKEN_PREFIXES = ["color-", "space-", "radius-", "text-"] as const;

const isToken = (name: string) => TOKEN_PREFIXES.some((p) => name.startsWith(p));

/** Removes `/* … *\/` comments, so a commented-out declaration or a `}` in a comment can't count. */
export function stripComments(css: string): string {
  return css.replace(/\/\*[\s\S]*?\*\//g, "");
}

/**
 * The token declarations of every top-level `:root { … }` block, keyed by name (no `--`), values
 * trimmed and lowercased. Throws when a token-prefixed property is declared anywhere else (an
 * `@theme` block, a selector) — the check would otherwise pass while ignoring it — or when one is
 * declared twice with different values.
 */
export function parseRootTokens(rawCss: string): Map<string, string> {
  const css = stripComments(rawCss);
  const tokens = new Map<string, string>();
  const inRoot: boolean[] = [];

  // Walk the blocks with a depth counter: `:root` blocks are only those opened at depth 0.
  let depth = 0;
  let blockStart = 0;
  let rootDepth: number | null = null;
  for (let i = 0; i < css.length; i++) {
    const ch = css[i];
    if (ch === "{") {
      const selector = css.slice(blockStart, i).trim();
      if (depth === 0 && selector === ":root") rootDepth = 1;
      depth++;
      blockStart = i + 1;
    } else if (ch === "}") {
      depth--;
      if (rootDepth !== null && depth < rootDepth) rootDepth = null;
      blockStart = i + 1;
    } else if (ch === ";") {
      blockStart = i + 1;
    }
    inRoot[i] = rootDepth !== null && depth === rootDepth;
  }

  for (const match of css.matchAll(/--([\w-]+)\s*:\s*([^;}]+)[;}]/g)) {
    const [, name, raw] = match;
    if (!isToken(name)) continue;
    if (!inRoot[match.index]) {
      throw new Error(`--${name} is declared outside a top-level :root block; tokens:check would ignore it`);
    }
    const value = raw.trim().toLowerCase();
    const previous = tokens.get(name);
    if (previous !== undefined && previous !== value) {
      throw new Error(`--${name} is declared twice in :root (${previous}, ${value})`);
    }
    tokens.set(name, value);
  }
  if (tokens.size === 0) throw new Error("no :root design tokens found");
  return tokens;
}

const kebab = (name: string) => name.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);

/** `src/theme/tokens.ts`, flattened into the web's custom-property names and CSS spelling. */
export function mobileTokens(): Map<string, string> {
  const vars = new Map<string, string>();
  for (const [k, v] of Object.entries(colors)) vars.set(`color-${kebab(k)}`, v.toLowerCase());
  for (const [k, v] of Object.entries(space)) vars.set(`space-${k}`, `${v}px`);
  for (const [k, v] of Object.entries(radius)) vars.set(`radius-${k}`, `${v}px`);
  for (const [k, v] of Object.entries(fontSize)) vars.set(`text-${k}`, `${v}px`);
  return vars;
}

/** Human-readable differences between the web's tokens and the mobile ones; empty = in sync. */
export function diffTokens(web: Map<string, string>, mobile: Map<string, string>): string[] {
  const problems: string[] = [];
  for (const [name, value] of web) {
    const mine = mobile.get(name);
    if (mine === undefined) problems.push(`missing  --${name}: ${value}`);
    else if (mine !== value) problems.push(`differs  --${name}: web ${value}, mobile ${mine}`);
  }
  for (const [name, value] of mobile) {
    if (!web.has(name)) problems.push(`extra    --${name}: ${value} (not in the web)`);
  }
  return problems;
}

/**
 * `--local` → the default sibling checkout; `--local=PATH` → PATH; `--local=` (empty) is an
 * error rather than silently meaning "this repo". Paths may contain `=`.
 */
export function parseLocalArg(arg: string | undefined, fallback: string): string | null {
  if (arg === undefined) return null;
  if (arg === "--local") return fallback;
  const value = arg.slice("--local=".length);
  if (value === "") throw new Error("--local= needs a path (or use --local for the sibling checkout)");
  return value;
}
