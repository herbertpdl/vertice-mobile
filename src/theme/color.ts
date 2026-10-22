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

/** The lighter alpha of inline banners and the dialog's error row (`14`). */
export const SOFT_TINT_ALPHA = 0x14 / 255;

/**
 * The only non-token colors the mobile designs use, all pure black/white overlays: the scrim
 * behind a play glyph on a photo (`#000000B3`) and the glyph (`#FFFFFF`), and the backdrop behind
 * sheets and dialogs (`#000000A8`). They sit on photos or dim the whole screen, so they are not
 * theme colors.
 */
export const overlay = {
  mediaScrim: "#000000b3",
  mediaGlyph: "#ffffff",
  /** The play disc's hairline on a photo (M Video Thumbnail, `#FFFFFF33`). */
  mediaGlyphSoft: "#ffffff33",
  backdrop: "#000000a8",
  /** Drop shadows (M Tab Bar, M Toast, M Confirm Dialog): black, opacity set per shadow. */
  shadow: "#000000",
} as const;

/**
 * The design's drop shadows (black at an opacity; RN's `shadowRadius` is about half the design's
 * blur). `elevation` is Android's approximation of the same depth.
 */
export const shadows = {
  /** M Tab Bar: #00000066, y 10, blur 28. */
  tabBar: { shadowColor: overlay.shadow, shadowOpacity: 0.4, shadowOffset: { width: 0, height: 10 }, shadowRadius: 14, elevation: 12 },
  /** M Toast: #00000066, y 8, blur 24. */
  toast: { shadowColor: overlay.shadow, shadowOpacity: 0.4, shadowOffset: { width: 0, height: 8 }, shadowRadius: 12, elevation: 10 },
  /** M Confirm Dialog: #00000080, y 16, blur 40. */
  dialog: { shadowColor: overlay.shadow, shadowOpacity: 0.5, shadowOffset: { width: 0, height: 16 }, shadowRadius: 20, elevation: 16 },
  /** M Rest Timer, docked over the workout footer: #00000080, y -8, blur 24. */
  restTimer: { shadowColor: overlay.shadow, shadowOpacity: 0.5, shadowOffset: { width: 0, height: -8 }, shadowRadius: 12, elevation: 10 },
} as const;
