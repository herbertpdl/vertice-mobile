import { Check } from "lucide-react-native";
import type { ReactNode } from "react";
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";

import { colors, controls, disabledOpacity, radius, space } from "@/theme";

import { Text } from "../Text";

export type CheckboxProps = {
  checked: boolean;
  onChange: (checked: boolean) => void;
  /**
   * A plain string, or rich content (text with `InlineLink`s, as on Cadastro). With rich content,
   * pass `accessibilityLabel` too: links inside it stay separately focusable.
   */
  label: ReactNode;
  accessibilityLabel?: string;
  disabled?: boolean;
  /** Field error for a required box ("Aceite os termos para continuar"). */
  error?: string;
  style?: StyleProp<ViewStyle>;
};

/**
 * M Checkbox (checked: primary fill + check; unchecked: 1.5 `borderStrong` ring) with its label.
 * The box itself is the toggle — a 44 pt target around the 24 pt box — so links inside a rich
 * label stay independently tappable.
 */
export function Checkbox({
  checked,
  onChange,
  label,
  accessibilityLabel,
  disabled = false,
  error,
  style,
}: CheckboxProps) {
  const textLabel = typeof label === "string" ? label : accessibilityLabel;
  return (
    <View style={[styles.root, disabled ? styles.disabled : null, style]}>
      <View style={styles.row}>
        <Pressable
          accessibilityRole="checkbox"
          accessibilityLabel={textLabel}
          accessibilityHint={error}
          accessibilityState={{ checked, disabled }}
          disabled={disabled}
          onPress={() => onChange(!checked)}
          hitSlop={(controls.hitTarget - 24) / 2}
          style={[styles.box, checked ? styles.checked : error === undefined ? styles.unchecked : styles.invalid]}
        >
          {checked ? <Check size={16} color={colors.primaryText} strokeWidth={3} /> : null}
        </Pressable>
        {typeof label === "string" ? (
          <Text
            variant="body"
            color="textSecondary"
            style={styles.label}
            onPress={disabled ? undefined : () => onChange(!checked)}
            accessible={false}
          >
            {label}
          </Text>
        ) : (
          <View style={styles.label}>{label}</View>
        )}
      </View>
      {error === undefined ? null : (
        <Text variant="caption" color="danger" accessibilityLiveRegion="polite">
          {error}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: space[2] },
  row: { flexDirection: "row", alignItems: "flex-start", gap: space[3] },
  box: {
    width: 24,
    height: 24,
    borderRadius: radius.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  checked: { backgroundColor: colors.primary },
  unchecked: { borderWidth: 1.5, borderColor: colors.borderStrong },
  invalid: { borderWidth: 1.5, borderColor: colors.danger },
  label: { flex: 1, paddingTop: 2 },
  disabled: { opacity: disabledOpacity.field },
});
