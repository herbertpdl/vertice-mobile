import type { ReactNode } from "react";
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";

import { useAnnounceOnIos } from "@/lib/a11y";
import { colors, controls, disabledOpacity, radius, sizes, space } from "@/theme";

import { Text } from "../Text";

export type FieldFrameProps = {
  label?: string;
  /** Shown under the box in danger; replaces `help`. Announced when it appears. */
  error?: string;
  /** Neutral helper line under the box ("O aluno receberá um convite por e-mail."). */
  help?: string;
  focused?: boolean;
  disabled?: boolean;
  /** Extra content on the help line's right (M Text Area's "112 / 2000" counter). */
  trailingFooter?: ReactNode;
  /** The box's content: an input, a value + chevron, … */
  children: ReactNode;
  /** Box overrides (M Text Area grows to 120 and pads vertically). */
  boxStyle?: StyleProp<ViewStyle>;
  style?: StyleProp<ViewStyle>;
};

/** How much the 1.5 pt focus border eats into the content, taken back from the padding. */
const FOCUS_INSET = sizes.focusBorderWidth - 1;

/**
 * The structure every M Field-family component shares: 13/600 label, 52-high surface box with a
 * border that turns primary (1.5) on focus and danger on error, and a 13 help/error line. Inputs
 * (`TextField`, `TextArea`, `SelectField`, `DateField`) render their content inside it. The
 * thicker focus border is compensated in the padding so the content doesn't shift.
 */
export function FieldFrame({
  label,
  error,
  help,
  focused = false,
  disabled = false,
  trailingFooter,
  children,
  boxStyle,
  style,
}: FieldFrameProps) {
  useAnnounceOnIos(error);
  const message = error ?? help;
  const showFocus = focused && error === undefined;
  return (
    <View style={[styles.root, disabled ? styles.disabled : null, style]}>
      {label === undefined ? null : (
        <Text variant="label" color={disabled ? "textTertiary" : "textSecondary"}>
          {label}
        </Text>
      )}
      <View
        style={[
          styles.box,
          disabled ? styles.boxDisabled : null,
          error !== undefined ? styles.boxError : showFocus ? styles.boxFocused : null,
          boxStyle,
          showFocus ? styles.focusInset : null,
        ]}
      >
        {children}
      </View>
      {message === undefined && trailingFooter === undefined ? null : (
        <View style={styles.footer}>
          <Text
            variant="caption"
            color={error === undefined ? "textSecondary" : "danger"}
            style={styles.message}
            // Android reads an error as soon as it appears; iOS through `useAnnounceOnIos`.
            accessibilityLiveRegion={error === undefined ? "none" : "polite"}
          >
            {message ?? ""}
          </Text>
          {trailingFooter}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: space[2] },
  disabled: { opacity: disabledOpacity.field },
  box: {
    minHeight: controls.height,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: space[4],
    flexDirection: "row",
    alignItems: "center",
    gap: controls.fieldContentGap,
  },
  boxDisabled: { backgroundColor: colors.bg },
  boxFocused: { borderColor: colors.primary, borderWidth: sizes.focusBorderWidth },
  focusInset: { paddingHorizontal: space[4] - FOCUS_INSET },
  boxError: { borderColor: colors.danger },
  footer: { flexDirection: "row", alignItems: "center", gap: sizes.fieldHelpGap },
  message: { flex: 1 },
});
