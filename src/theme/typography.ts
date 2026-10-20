import type { TextStyle } from "react-native";

/**
 * Font families as loaded by `useAppFonts` (`src/theme/fonts.ts`). React Native picks a custom
 * font's weight by *family name*, not `fontWeight` (Android ignores `fontWeight` on a custom
 * family and iOS only honours it when every weight shares one family), so a weight is always a
 * separate family here and nothing in the app sets `fontWeight`.
 */
export const fontFamilies = {
  base: {
    regular: "Inter_400Regular",
    medium: "Inter_500Medium",
    semibold: "Inter_600SemiBold",
    bold: "Inter_700Bold",
  },
  heading: {
    regular: "SpaceGrotesk_400Regular",
    medium: "SpaceGrotesk_500Medium",
    semibold: "SpaceGrotesk_600SemiBold",
    bold: "SpaceGrotesk_700Bold",
  },
} as const;

export type FontFamily = keyof typeof fontFamilies;
export type FontWeight = keyof (typeof fontFamilies)["base"];

export function fontFamily(family: FontFamily, weight: FontWeight): string {
  return fontFamilies[family][weight];
}

type TextPreset = {
  family: FontFamily;
  weight: FontWeight;
  size: number;
  /** Ratio, as in pen.dev (`lineHeight: 1.4`); converted to points by `textStyle`. */
  lineHeight?: number;
  letterSpacing?: number;
  uppercase?: boolean;
};

/**
 * The type styles the pen.dev mobile screens use (frame "Vertice — Mobile App"), named by role.
 * Sizes that are not on the web's `--text-*` scale (26, 17, 15, 11, 10) come from the mobile
 * designs, which size for phones; they stay here rather than in `tokens.ts`.
 */
export const textPresets = {
  /** "Bem-vindo de volta" — auth hero title. */
  display: { family: "heading", weight: "bold", size: 28 },
  /** "Alunos", "Bom dia, Ana" — tab screen title. */
  title: { family: "heading", weight: "bold", size: 26 },
  /** "Marina Costa", "Supino Reto com Barra" — detail screen title. */
  headline: { family: "heading", weight: "bold", size: 22, lineHeight: 1.25 },
  /** "Novo aluno" — sheet title. */
  sheetTitle: { family: "heading", weight: "bold", size: 20 },
  /** "Feedbacks recentes" — section header. */
  section: { family: "heading", weight: "semibold", size: 18 },
  /** "Nenhum aluno encontrado" — empty-state title. */
  subtitle: { family: "heading", weight: "semibold", size: 17 },
  /** Centered nav bar title. */
  navTitle: { family: "base", weight: "semibold", size: 17 },
  /** "Entre para gerenciar seus alunos e treinos." — lead paragraph. */
  lead: { family: "base", weight: "regular", size: 16, lineHeight: 1.4 },
  /** Input text, row titles. */
  bodyLg: { family: "base", weight: "regular", size: 16 },
  bodyLgStrong: { family: "base", weight: "semibold", size: 16 },
  /** Secondary actions, "Não tem uma conta?". */
  bodyMd: { family: "base", weight: "regular", size: 15 },
  bodyMdStrong: { family: "base", weight: "semibold", size: 15 },
  body: { family: "base", weight: "regular", size: 14 },
  bodyStrong: { family: "base", weight: "semibold", size: 14 },
  /** Field labels. */
  label: { family: "base", weight: "semibold", size: 13 },
  caption: { family: "base", weight: "regular", size: 13 },
  small: { family: "base", weight: "regular", size: 12 },
  smallStrong: { family: "base", weight: "semibold", size: 12 },
  /** Badges. */
  badge: { family: "base", weight: "semibold", size: 11 },
  /** "PERÍODO", "SEG" — tracked caps. */
  overline: { family: "base", weight: "semibold", size: 11, letterSpacing: 1, uppercase: true },
  /** "SÉRIE", tab bar labels. */
  micro: { family: "base", weight: "semibold", size: 10, letterSpacing: 1, uppercase: true },
  /** Numbers in the heading face: stat values, times, percentages. */
  numeric: { family: "heading", weight: "semibold", size: 14 },
} as const satisfies Record<string, TextPreset>;

export type TextVariant = keyof typeof textPresets;

/** A preset as a React Native style (family by weight, line height in points). */
export function textStyle(variant: TextVariant): TextStyle {
  const preset: TextPreset = textPresets[variant];
  return {
    fontFamily: fontFamily(preset.family, preset.weight),
    fontSize: preset.size,
    ...(preset.lineHeight === undefined
      ? {}
      : { lineHeight: Math.round(preset.size * preset.lineHeight) }),
    ...(preset.letterSpacing === undefined ? {} : { letterSpacing: preset.letterSpacing }),
    ...(preset.uppercase ? { textTransform: "uppercase" } : {}),
  };
}
