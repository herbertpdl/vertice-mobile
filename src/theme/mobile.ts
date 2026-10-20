/**
 * Mobile-only design values: sizes the pen.dev mobile components ("DS - Mobile Components") use
 * that have no web token. Each is named after the component it comes from; colors are never
 * defined here (`tokens.ts`, tinted with `withAlpha` from `color.ts`).
 */
export const controls = {
  /** M Button, M Button Secondary, M Field box. */
  height: 52,
  /** M Search Field, smaller pill controls. */
  searchHeight: 48,
  /** M Chip. */
  chipHeight: 40,
  /** M Icon Button and the minimum touch target on both platforms (Apple HIG 44 pt). */
  hitTarget: 44,
  /** M Nav Bar vertical padding around its 44 pt buttons. */
  navBarPaddingVertical: 6,
  /** Gap between a field's text and its trailing glyph (M Field, M Search Field). */
  fieldContentGap: 10,
  /** M Search Field and M Chip horizontal padding. */
  pillPaddingHorizontal: 18,
  /** M Text Area box: height and vertical padding. */
  textAreaHeight: 120,
  textAreaPaddingVertical: 14,
  /** Gap between the lines of M Divider Or. */
  dividerLabelGap: 14,
} as const;

/** Horizontal padding of a screen's content (pen.dev mobile screens use 20 on a 390 frame). */
export const screenPaddingHorizontal = 20;

/**
 * Disabled looks, per component (the mobile designs don't use one opacity for everything):
 * M Button / M Button Danger swap to a `surfaceActive` fill with a tertiary label (no fade),
 * M Button Secondary fades to 0.45, M Field (and other inputs) to 0.6.
 */
export const disabledOpacity = {
  secondaryButton: 0.45,
  field: 0.6,
} as const;

/** Opacity of `M Button - Loading`. */
export const loadingOpacity = 0.75;
