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
  // The designs never set Space Grotesk below 500; "regular" maps to medium so every
  // (family, weight) pair still resolves to a loaded face.
  heading: {
    regular: "SpaceGrotesk_500Medium",
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
};

/**
 * The type styles the pen.dev mobile frames use ("Vertice — Mobile App" and "DS - Mobile
 * Components", read with instances resolved), named by role. Sizes that are not on the web's
 * `--text-*` scale (26, 20, 17, 15) come from the mobile designs, which size for phones; they
 * stay here rather than in `tokens.ts`. Line heights of 1.4–1.5 in the design map to the nearest
 * `*Relaxed`/`lead` preset.
 */
export const textPresets = {
  /** "Bem-vindo de volta" — auth hero title. */
  display: { family: "heading", weight: "bold", size: 28 },
  /** "Alunos", "Bom dia, Ana"; M Stat Card values. */
  title: { family: "heading", weight: "bold", size: 26 },
  /** "Marina Costa", "Supino Reto com Barra" — detail screen title. */
  headline: { family: "heading", weight: "bold", size: 22, lineHeight: 1.25 },
  /** "Novo aluno" — sheet title; detail stat values ("3 de 5", "Hoje"). */
  titleSm: { family: "heading", weight: "bold", size: 20 },
  /** "Feedbacks recentes" — section header. */
  section: { family: "heading", weight: "semibold", size: 18 },
  /** M Confirm Dialog title ("Esta ação é permanente"); `weight="semibold"` for the calendar month. */
  headingSm: { family: "heading", weight: "bold", size: 17 },
  /** Centered nav bar title; empty-state title ("Nenhum aluno encontrado"). */
  navTitle: { family: "base", weight: "semibold", size: 17 },
  /** "Entre para gerenciar seus alunos e treinos." — lead paragraph. */
  lead: { family: "base", weight: "regular", size: 16, lineHeight: 1.4 },
  /** Input text, row titles. */
  bodyLg: { family: "base", weight: "regular", size: 16 },
  /** Multi-line input text (M Text Area). */
  bodyLgRelaxed: { family: "base", weight: "regular", size: 16, lineHeight: 1.4 },
  /** Button labels, list names; M Avatar 48 initials. */
  bodyLgStrong: { family: "base", weight: "semibold", size: 16 },
  /** M Avatar 64 initials. */
  avatarLg: { family: "base", weight: "semibold", size: 22 },
  /** "Não tem uma conta?". */
  bodyMd: { family: "base", weight: "regular", size: 15 },
  bodyMdStrong: { family: "base", weight: "semibold", size: 15 },
  /** Exercise description, share-link explanation. */
  bodyMdRelaxed: { family: "base", weight: "regular", size: 15, lineHeight: 1.5 },
  body: { family: "base", weight: "regular", size: 14 },
  bodyStrong: { family: "base", weight: "semibold", size: 14 },
  /** Feedback quotes, plan description, empty-state text. */
  bodyRelaxed: { family: "base", weight: "regular", size: 14, lineHeight: 1.4 },
  /** Field labels. */
  label: { family: "base", weight: "semibold", size: 13 },
  /** Help and error lines, secondary row text. */
  caption: { family: "base", weight: "regular", size: 13 },
  small: { family: "base", weight: "regular", size: 12 },
  /** M Badge, M Stat Card labels, M Tab Bar labels. */
  smallStrong: { family: "base", weight: "semibold", size: 12 },
  /** M Week Dot letters, M Count Pill, weekday chips ("SEG"). */
  smallBold: { family: "base", weight: "bold", size: 12 },
  /** "PERÍODO", "CONTA" — section/table captions (the copy itself is uppercase). */
  overline: { family: "base", weight: "semibold", size: 12, letterSpacing: 0.5 },
  /** Numbers in the heading face: times, percentages. */
  numeric: { family: "heading", weight: "semibold", size: 14 },
  /** The tracked "VERTICE" wordmark next to the logo mark. */
  wordmark: { family: "heading", weight: "bold", size: 18, letterSpacing: 5 },
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
  };
}
