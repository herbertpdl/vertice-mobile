/**
 * `#rrggbb` + an alpha as `#rrggbbaa`. The pen.dev mobile components tint with token colors at a
 * fixed alpha (status badges are `#2ED5731F`: success at 0x1F ≈ 12%), so tints are derived from
 * tokens here instead of being written out as new hex values.
 */
export function withAlpha(hex: string, alpha: number): string {
  if (!/^#[0-9a-f]{6}$/i.test(hex)) throw new Error(`withAlpha expects #rrggbb, got ${hex}`);
  const byte = Math.round(Math.min(1, Math.max(0, alpha)) * 255);
  return `${hex}${byte.toString(16).padStart(2, "0")}`;
}

/** The alpha of the design's tinted badge backgrounds (`1F`). */
export const TINT_ALPHA = 0x1f / 255;

/**
 * The only non-token colors the mobile designs use, all pure black/white overlays: the scrim
 * behind a play glyph on a photo (`#000000B3`) and the glyph (`#FFFFFF`), and the backdrop behind
 * sheets and dialogs (`#000000A8`). They sit on photos or dim the whole screen, so they are not
 * theme colors.
 */
export const overlay = {
  mediaScrim: "#000000b3",
  mediaGlyph: "#ffffff",
  backdrop: "#000000a8",
} as const;
