import type { LucideIcon } from "lucide-react-native";
import { Pressable, StyleSheet, type PressableProps, type StyleProp, type ViewStyle } from "react-native";

import { colors, controls, disabledOpacity, radius, type ColorToken } from "@/theme";

export type IconButtonVariant = "primary" | "surface" | "plain";

export type IconButtonProps = Omit<PressableProps, "children" | "style"> & {
  icon: LucideIcon;
  /** Required: an icon has no visible text for screen readers to read. */
  accessibilityLabel: string;
  /**
   * `primary` = M Icon Button (cyan disc, "+" on the lists); `surface` = a surface disc with a
   * border (sheet close button); `plain` = no fill (M Nav Bar back/action).
   */
  variant?: IconButtonVariant;
  /** Glyph size; M Icon Button uses 22, the nav bar back chevron 26. */
  iconSize?: number;
  /** Glyph color, defaulting per variant. */
  color?: ColorToken;
  style?: StyleProp<ViewStyle>;
};

const looks: Record<IconButtonVariant, { fill: string; pressed: string; glyph: ColorToken; border?: string }> = {
  primary: { fill: colors.primary, pressed: colors.primaryActive, glyph: "primaryText" },
  surface: { fill: colors.surface, pressed: colors.surfaceActive, glyph: "textSecondary", border: colors.border },
  plain: { fill: "transparent", pressed: colors.surfaceHover, glyph: "textPrimary" },
};

/** M Icon Button: a 44×44 circular hit target around a lucide glyph. */
export function IconButton({
  icon: Icon,
  variant = "primary",
  iconSize = 22,
  color,
  disabled,
  style,
  ...rest
}: IconButtonProps) {
  const look = looks[variant];
  return (
    <Pressable
      {...rest}
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      style={({ pressed }) => [
        styles.base,
        { backgroundColor: pressed ? look.pressed : look.fill },
        look.border === undefined ? null : { borderWidth: 1, borderColor: look.border },
        disabled ? styles.disabled : null,
        style,
      ]}
    >
      <Icon size={iconSize} color={colors[color ?? look.glyph]} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    width: controls.hitTarget,
    height: controls.hitTarget,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
  },
  // No disabled M Icon Button in the design: match M Button Secondary's fade.
  disabled: { opacity: disabledOpacity.secondaryButton },
});
