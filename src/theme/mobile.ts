/**
 * Mobile-only design values: sizes the pen.dev mobile components ("DS - Mobile Components") use
 * that have no web token. Each is named after the component it comes from; colors are never
 * defined here (`tokens.ts` only).
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
} as const;

/** Horizontal padding of a screen's content (pen.dev mobile screens use 20 on a 390 frame). */
export const screenPaddingHorizontal = 20;

/** Opacity of a disabled control (the web `Button`'s `disabled:opacity-35`). */
export const disabledOpacity = 0.35;

/** Opacity of `M Button - Loading`. */
export const loadingOpacity = 0.75;
