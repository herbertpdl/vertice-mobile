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
  /** M Empty State icon disc and glyph. */
  emptyDisc: 72,
  emptyIcon: 30,
  /** M Form Error Banner / M Info Banner padding and gap (also the M Offline Banner gap). */
  bannerPadding: 14,
  bannerGap: 10,
  /** M List Row height and gap. */
  listRowHeight: 56,
  listRowGap: 14,
  /** M Multi Select Field gap between tags. */
  multiSelectTagGap: 6,
  /** M Empty State's vertical padding when it fills a screen (M - Feedbacks (Vazio)). */
  emptyScreenPaddingVertical: 96,
  /** M Empty State button minimum width. */
  emptyButtonMinWidth: 200,
  /** M Option Row / M Checkbox Row height. */
  optionRowHeight: 52,
  /** M Info Row vertical padding and label column width. */
  infoRowPaddingVertical: 13,
  infoLabelWidth: 96,
  /** M Segmented Tabs gap between items, and the gap inside an item (label ↔ count). */
  segmentedGap: 2,
  segmentedItemGap: 6,
  /** M Tab Bar capsule padding, tab pill radius, icon ↔ label gap. */
  tabCapsulePadding: 6,
  tabItemRadius: 22,
  tabItemGap: 3,
  /** M Bottom Sheet grabber. */
  grabberWidth: 36,
  grabberHeight: 5,
  /** M Bottom Sheet content gap between fields. */
  sheetContentGap: 18,
  /** M Calendar day cell height and selection circle. */
  calendarCell: 44,
  calendarDay: 40,
  calendarWeekdayHeight: 32,
  /** M Confirm Dialog width and icon disc. */
  dialogWidth: 330,
  dialogIcon: 48,
  /** M Toast padding. */
  toastPaddingVertical: 14,
  /** M - Login / M - Splash: gap between the screen's groups; the splash's spinner ↔ text gap. */
  authGroupGap: 28,
  loadingGroupGap: 14,
  /** Logo Mark's frame (the mark is inset inside it). */
  logoMark: 34,
  /** Gap between stacked cards in a list (M Student Card, M Plan Card). */
  cardListGap: 10,
  /** M - Alunos (Loading): gap inside a skeleton card. */
  skeletonCardGap: 14,
  /** M Student Card padding; M Link Box padding (4 around, 14 before the glyph). */
  studentCardPadding: 14,
  linkBoxPaddingLeft: 14,
  /** Gap between a detail header's name and e-mail (M - Detalhe do Aluno). */
  identityLinesGap: 5,
  /** A card-row placeholder's height in list skeletons. */
  skeletonCardHeight: 72,
  /** M Plan Card padding (16 vertical, 14 horizontal) and gap between its lines. */
  planCardPaddingVertical: 16,
  planCardPaddingHorizontal: 14,
  planCardLinesGap: 5,
  /** M Chart Bar: bar width, tallest bar, the card's bars area height. */
  chartBarWidth: 24,
  chartBarMaxHeight: 120,
  chartAreaHeight: 170,
  /** M Feedback Row / M Plan Ending Row / M Completed Workout Row vertical padding and gaps. */
  feedbackRowPaddingVertical: 16,
  planEndingRowPaddingVertical: 14,
  completedRowPaddingVertical: 13,
  rowColumnGap: 14,
  /** Gap between a row's title and subtitle lines (M Plan Ending Row 3, M Completed Workout Row 2). */
  rowLinesGap: 3,
  rowLinesGapTight: 2,
  /** Skeleton placeholders of the dashboard/feedback loading screens (M - Dashboard (Loading)). */
  skeletonTitleWidth: 190,
  skeletonTitleHeight: 24,
  skeletonSubtitleWidth: 240,
  skeletonStatHeight: 96,
  skeletonSectionWidth: 150,
  skeletonSectionHeight: 16,
  skeletonAvatar: 44,
  /** M - Dashboard: gap between the screen's groups (greeting, stats, sections). */
  dashboardGroupGap: 28,
  /** "Não tem uma conta? Cadastre-se": gap between the sentence and its link. */
  inlineLinkGap: 6,
  /** M Checkbox / M Checkbox Row unchecked ring width. */
  checkboxBorderWidth: 1.5,
  /**
   * M Tab Bar capsule height at the default text size: padding 6 + tab (8 + 22 icon + 3 + ~16
   * label + 8) + 6. Tab labels cap their font scaling (`TAB_LABEL_MAX_SCALE`) so this holds.
   */
  tabBarCapsuleHeight: 69,
  /** M Tab Bar's padding below the capsule, above the home indicator. */
  tabBarBottomGap: 12,
  /** M Confirm Dialog: stacked buttons gap and error row vertical padding. */
  dialogButtonGap: 10,
  dialogErrorPaddingVertical: 10,
  /** M Bottom Sheet top padding (above the grabber). */
  sheetPaddingTop: 10,
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

/** The largest font scale tab labels follow, so the floating capsule keeps its height. */
export const TAB_LABEL_MAX_SCALE = 1.2;

/**
 * How far from the bottom the floating M Tab Bar reaches (its top edge), for a given bottom safe
 * area inset. Tab screens pad their content by this (plus breathing room) so their last row clears
 * the capsule; toasts sit just above it.
 */
export function tabBarInset(safeAreaBottom: number): number {
  return safeAreaBottom + sizes.tabBarBottomGap + sizes.tabBarCapsuleHeight;
}
