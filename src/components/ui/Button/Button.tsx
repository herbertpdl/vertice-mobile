import type { LucideIcon } from "lucide-react-native";
import {
  Pressable,
  StyleSheet,
  View,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from "react-native";

import { colors, controls, disabledOpacity, loadingOpacity, radius, sizes, space, type ColorToken } from "@/theme";

import { Spinner } from "../Spinner";
import { Text } from "../Text";

export type ButtonVariant = "primary" | "secondary" | "danger" | "ghost";

export type ButtonProps = Omit<PressableProps, "children" | "style"> & {
  label: string;
  /**
   * `primary` = M Button, `secondary` = M Button Secondary (surface + strong border),
   * `danger` = M Button Danger, `ghost` = M Button Ghost (no fill, primary label).
   */
  variant?: ButtonVariant;
  /** M Button - Loading: spinner + label (pass the in-progress label, e.g. "Salvando…"). */
  loading?: boolean;
  icon?: LucideIcon;
  /** Layout only (flex, width, margins). */
  style?: StyleProp<ViewStyle>;
};

type Look = { fill: string; pressedFill: string; label: ColorToken; border?: string };

const looks: Record<ButtonVariant, Look> = {
  primary: { fill: colors.primary, pressedFill: colors.primaryActive, label: "primaryText" },
  secondary: {
    fill: colors.surface,
    pressedFill: colors.surfaceActive,
    label: "textPrimary",
    border: colors.borderStrong,
  },
  danger: { fill: colors.danger, pressedFill: colors.dangerHover, label: "bg" },
  ghost: { fill: "transparent", pressedFill: colors.surfaceHover, label: "primary" },
};

/** The fill a button shows for a state, per its M Button variant (exported for tests). */
export function buttonFill(variant: ButtonVariant, state: { pressed: boolean; disabled: boolean }): string {
  const look = looks[variant];
  const filled = variant === "primary" || variant === "danger";
  if (state.disabled && filled) return colors.surfaceActive;
  return state.pressed ? look.pressedFill : look.fill;
}

/**
 * M Button and its variants. Disabled follows the design per variant: filled buttons turn
 * `surfaceActive` with a tertiary label, secondary fades to 0.45, ghost dims its label.
 */
export function Button({
  label,
  variant = "primary",
  loading = false,
  disabled: disabledProp,
  icon: Icon,
  style,
  accessibilityState,
  ...rest
}: ButtonProps) {
  const disabled = disabledProp === true;
  const look = looks[variant];
  const labelColor: ColorToken = disabled && variant !== "secondary" ? "textTertiary" : look.label;

  return (
    <Pressable
      {...rest}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ ...accessibilityState, disabled, busy: loading }}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.base,
        { backgroundColor: buttonFill(variant, { pressed, disabled }) },
        look.border === undefined ? null : { borderWidth: 1, borderColor: look.border },
        disabled && variant === "secondary" ? { opacity: disabledOpacity.secondaryButton } : null,
        loading ? styles.loading : null,
        style,
      ]}
    >
      {loading ? (
        <Spinner size={20} color={labelColor} />
      ) : Icon === undefined ? null : (
        <View importantForAccessibility="no-hide-descendants">
          <Icon size={20} color={colors[labelColor]} />
        </View>
      )}
      <Text variant="bodyLgStrong" color={labelColor} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: controls.height,
    borderRadius: radius.lg,
    paddingHorizontal: space[6],
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: space[2],
  },
  loading: { opacity: loadingOpacity, gap: sizes.buttonLoadingGap },
});
