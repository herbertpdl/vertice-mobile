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

/**
 * Fixed sizes of individual M components that are off the 4 pt spacing scale, named after the
 * component (and the property) they come from.
 */
export const sizes = {
  /** M Badge horizontal padding (vertical is `space[1]`). */
  badgePaddingHorizontal: 10,
  /** M Count Pill padding. */
  countPillPaddingVertical: 2,
  countPillPaddingHorizontal: 7,
  /** M Tag height. */
  tagHeight: 28,
  /** M Stat Card gap between label, value and helper. */
  statCardGap: 6,
  /** M Week Dot diameter and the gap in M Week Dots. */
  weekDot: 24,
  weekDotGap: 6,
  /** M Checkbox box. */
  checkbox: 24,
  /** M Progress Bar track height. */
  progressBarHeight: 6,
  /** M Exercise Thumb and its play badge. */
  exerciseThumb: 56,
  playBadge: 24,
  /** M Button - Loading gap between spinner and label (M Button's own gap is `space[2]`). */
  buttonLoadingGap: 10,
  /** M Field help row gap. */
  fieldHelpGap: 6,
  /** M Field focused border width (1 otherwise). */
  focusBorderWidth: 1.5,
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
