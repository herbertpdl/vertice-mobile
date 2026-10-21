import { Text as RNText, type TextProps as RNTextProps } from "react-native";

import {
  colors,
  fontFamily,
  textPresets,
  textStyle,
  type ColorToken,
  type FontWeight,
  type TextVariant,
} from "@/theme";

export type TextProps = RNTextProps & {
  /** A role from the pen.dev mobile type scale (`textPresets`). Defaults to `body`. */
  variant?: TextVariant;
  /** A color token. Defaults to `textPrimary`. */
  color?: ColorToken;
  /** Overrides the preset's weight, keeping its family (weight is a font family on RN). */
  weight?: FontWeight;
  align?: "left" | "center" | "right";
};

/**
 * The only way UI text is rendered: picks the font family by weight (see `typography.ts`) and
 * colors from tokens. `style` is applied last for layout-only tweaks (margins, flex); don't use
 * it to set `fontFamily`, `fontSize` or `color`.
 */
export function Text({
  variant = "body",
  color = "textPrimary",
  weight,
  align,
  style,
  ...rest
}: TextProps) {
  const preset = textPresets[variant];
  return (
    <RNText
      {...rest}
      style={[
        textStyle(variant),
        { color: colors[color] },
        weight === undefined ? null : { fontFamily: fontFamily(preset.family, weight) },
        align === undefined ? null : { textAlign: align },
        style,
      ]}
    />
  );
}
