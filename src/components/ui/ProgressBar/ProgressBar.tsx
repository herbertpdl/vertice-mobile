import { useEffect } from "react";
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

import { colors, radius, sizes } from "@/theme";

export type ProgressTone = "primary" | "success" | "warning" | "danger";

/** A stretch of wall-clock time (epoch ms) the bar fills across on its own. */
export type ProgressSpan = { startedAt: number; endsAt: number };

export type ProgressBarProps = {
  /** 0–1; clamped. */
  value: number;
  /** M Progress Bar (primary) / Success / Warning / Danger. */
  tone?: ProgressTone;
  /**
   * Fill continuously from `startedAt` to `endsAt` on the UI thread instead of stepping with
   * `value` (a running timer). `value` still drives what screen readers hear, and the stepped
   * fill under "reduce motion".
   */
  span?: ProgressSpan;
  /** What is progressing, for screen readers ("Adesão semanal"). */
  accessibilityLabel: string;
  style?: StyleProp<ViewStyle>;
};

/** M Progress Bar: a 6-high `surfaceHover` track with a rounded fill. */
export function ProgressBar({ value, tone = "primary", span, accessibilityLabel, style }: ProgressBarProps) {
  const clamped = Math.min(1, Math.max(0, Number.isFinite(value) ? value : 0));
  const percent = Math.round(clamped * 100);
  const reduceMotion = useReducedMotion();
  const running = span !== undefined && !reduceMotion;
  const startedAt = span?.startedAt;
  const endsAt = span?.endsAt;
  const fill = useSharedValue(0);

  useEffect(() => {
    if (!running || startedAt === undefined || endsAt === undefined) return;
    // Read from the clock, not the last tick: the fill lands on full exactly at `endsAt`.
    const now = Date.now();
    const total = endsAt - startedAt;
    const from = total <= 0 ? 1 : Math.min(1, Math.max(0, (now - startedAt) / total));
    // `set` rather than `.value`: the React Compiler forbids mutating a hook's return value.
    fill.set(from);
    fill.set(withTiming(1, { duration: Math.max(0, endsAt - now), easing: Easing.linear }));
    return () => cancelAnimation(fill);
  }, [running, startedAt, endsAt, fill]);

  const animatedFill = useAnimatedStyle(() => ({ width: `${fill.get() * 100}%` }));

  return (
    <View
      style={[styles.track, style]}
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={accessibilityLabel}
      accessibilityValue={{ min: 0, max: 100, now: percent, text: `${percent}%` }}
    >
      <Animated.View
        style={[styles.fill, { backgroundColor: colors[tone] }, running ? animatedFill : { width: `${percent}%` }]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    height: sizes.progressBarHeight,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceHover,
    overflow: "hidden",
  },
  fill: { height: "100%", borderRadius: radius.full },
});
