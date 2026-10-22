import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";

import { colors, controls, disabledOpacity, radius, sizes } from "@/theme";

export type SwitchProps = {
  value: boolean;
  onValueChange: (value: boolean) => void;
  /** What the switch turns on ("Mostrar e-mail aos alunos"). */
  accessibilityLabel: string;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
};

/** Padding between the track and the knob (M Switch: 51 × 31 track, 27 knob). */
const INSET = (sizes.switchHeight - sizes.switchKnob) / 2;
/** Grows the 31 pt track's hit box to the 44 pt target. */
const SLOP = (controls.hitTarget - sizes.switchHeight) / 2;

/**
 * M Switch / M Switch Off: a primary track with the white knob at the end when on, a
 * `surfaceActive` track with the knob at the start when off. A plain `Pressable` rather than RN's
 * `Switch` so both platforms draw the design's track; the hit box grows to 44 pt tall.
 */
export function Switch({ value, onValueChange, accessibilityLabel, disabled = false, style }: SwitchProps) {
  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ checked: value, disabled }}
      disabled={disabled}
      onPress={() => onValueChange(!value)}
      hitSlop={{ top: SLOP, bottom: SLOP }}
      style={[styles.track, value ? styles.on : styles.off, disabled ? styles.disabled : null, style]}
    >
      <View style={styles.knob} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  track: {
    width: sizes.switchWidth,
    height: sizes.switchHeight,
    borderRadius: radius.full,
    padding: INSET,
    flexDirection: "row",
    alignItems: "center",
  },
  on: { backgroundColor: colors.primary, justifyContent: "flex-end" },
  off: { backgroundColor: colors.surfaceActive, justifyContent: "flex-start" },
  knob: { width: sizes.switchKnob, height: sizes.switchKnob, borderRadius: radius.full, backgroundColor: colors.textPrimary },
  disabled: { opacity: disabledOpacity.field },
});
