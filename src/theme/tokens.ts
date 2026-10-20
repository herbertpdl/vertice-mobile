/**
 * The design tokens, 1:1 with vertice-web-react's `src/app/globals.css` `:root` custom properties
 * (and the pen.dev file's variables they were generated from). Names map mechanically:
 * `--color-surface-hover` → `colors.surfaceHover`, `--space-4` → `space[4]`, `--radius-md` →
 * `radius.md`, `--text-2xl` → `fontSize["2xl"]`.
 *
 * Never hand-edit a value here without the web changing first: `npm run tokens:check` diffs this
 * file against the web's at the commit pinned in `.web-ref` (CI runs it). Mobile-only values live
 * in `mobile.ts`. Keep this module free of React Native imports — the check script loads it in
 * plain Node.
 */

export const colors = {
  bg: "#0a0e14",
  surface: "#141a22",
  surfaceHover: "#1c2430",
  surfaceActive: "#232c3a",
  border: "#232c3a",
  borderStrong: "#333f50",

  textPrimary: "#f2f6fa",
  textSecondary: "#9aa7b8",
  textTertiary: "#5c6a7c",

  primary: "#00e5ff",
  primaryHover: "#73f1ff",
  primaryActive: "#00b8cc",
  primaryText: "#04141a",

  secondary: "#7c4dff",
  secondaryHover: "#aa8bff",
  secondaryActive: "#6339e0",

  success: "#2ed573",
  warning: "#ffb020",
  danger: "#ff5c5c",
  dangerHover: "#ff9696",
  info: "#4da6ff",
} as const;

export const space = {
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  5: 20,
  6: 24,
  8: 32,
  10: 40,
  12: 48,
  16: 64,
} as const;

export const radius = {
  sm: 6,
  md: 10,
  lg: 16,
  xl: 24,
  full: 999,
} as const;

export const fontSize = {
  xs: 12,
  sm: 13,
  base: 14,
  md: 16,
  lg: 18,
  xl: 22,
  "2xl": 28,
  "3xl": 36,
  "4xl": 48,
  "5xl": 64,
} as const;

export type ColorToken = keyof typeof colors;
export type SpaceToken = keyof typeof space;
export type RadiusToken = keyof typeof radius;
export type FontSizeToken = keyof typeof fontSize;
