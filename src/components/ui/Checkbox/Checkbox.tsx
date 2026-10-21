import { Check } from "lucide-react-native";
import type { ReactNode } from "react";
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";

import { useAnnounceOnIos } from "@/lib/a11y";
import { colors, controls, disabledOpacity, radius, sizes, space } from "@/theme";

import { Text } from "../Text";

type CheckboxBase = {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  /** Field error for a required box ("Aceite os termos para continuar"). */
  error?: string;
  style?: StyleProp<ViewStyle>;
};

export type CheckboxProps = CheckboxBase &
  (
    | { label: string; accessibilityLabel?: string }
    /** Rich content (text with `InlineLink`s, as on Cadastro) needs a spoken label of its own. */
    | { label: ReactNode; accessibilityLabel: string }
  );

/** Negative margin that lets the 44 pt hit box overhang the 24 pt visual on every side. */
const OVERHANG = (controls.hitTarget - sizes.checkbox) / 2;

/**
 * M Checkbox (checked: primary fill + check; unchecked: 1.5 `borderStrong` ring) with its label —
 * a 14 secondary sentence beside the box (the Cadastro terms line), not M Checkbox Row, which is
 * `OptionRow mode="multiple"`. The toggle is a real 44×44 box around the 24 pt visual (hitSlop
 * would be clipped at the row's edges), so links inside a rich label stay independently
 * tappable. With an error the ring turns danger (not in the design, which has no error state).
 */
export function Checkbox({ checked, onChange, label, accessibilityLabel, disabled = false, error, style }: CheckboxProps) {
  useAnnounceOnIos(error);
  const spoken = accessibilityLabel ?? (typeof label === "string" ? label : undefined);
  return (
    <View style={[styles.root, disabled ? styles.disabled : null, style]}>
      <View style={styles.row}>
        <Pressable
          accessibilityRole="checkbox"
          accessibilityLabel={spoken}
          accessibilityHint={error}
          accessibilityState={{ checked, disabled }}
          disabled={disabled}
          onPress={() => onChange(!checked)}
          style={styles.hitBox}
        >
          <View style={[styles.box, checked ? styles.checked : error === undefined ? styles.unchecked : styles.invalid]}>
            {checked ? <Check size={16} color={colors.primaryText} strokeWidth={3} /> : null}
          </View>
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
  hitBox: {
    width: controls.hitTarget,
    height: controls.hitTarget,
    margin: -OVERHANG,
    alignItems: "center",
    justifyContent: "center",
  },
  box: {
    width: sizes.checkbox,
    height: sizes.checkbox,
    borderRadius: radius.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  checked: { backgroundColor: colors.primary },
  unchecked: { borderWidth: sizes.checkboxBorderWidth, borderColor: colors.borderStrong },
  invalid: { borderWidth: sizes.checkboxBorderWidth, borderColor: colors.danger },
  label: { flex: 1, paddingTop: 2 },
  disabled: { opacity: disabledOpacity.field },
});
