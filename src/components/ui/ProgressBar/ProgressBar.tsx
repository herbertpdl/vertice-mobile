import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";

import { colors, radius } from "@/theme";

export type ProgressTone = "primary" | "success" | "warning" | "danger";

export type ProgressBarProps = {
  /** 0–1; clamped. */
  value: number;
  /** M Progress Bar (primary) / Success / Warning / Danger. */
  tone?: ProgressTone;
  /** What is progressing, for screen readers ("Adesão semanal"). */
  accessibilityLabel: string;
  style?: StyleProp<ViewStyle>;
};

/** M Progress Bar: a 6-high `surfaceHover` track with a rounded fill. */
export function ProgressBar({ value, tone = "primary", accessibilityLabel, style }: ProgressBarProps) {
  const clamped = Math.min(1, Math.max(0, Number.isFinite(value) ? value : 0));
  const percent = Math.round(clamped * 100);
  return (
    <View
      style={[styles.track, style]}
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={accessibilityLabel}
      accessibilityValue={{ min: 0, max: 100, now: percent, text: `${percent}%` }}
    >
      <View style={[styles.fill, { width: `${percent}%`, backgroundColor: colors[tone] }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    height: 6,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceHover,
    overflow: "hidden",
  },
  fill: { height: "100%", borderRadius: radius.full },
});
