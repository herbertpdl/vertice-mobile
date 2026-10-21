import { useEffect } from "react";
import type { DimensionValue, StyleProp, ViewStyle } from "react-native";
import Animated, {
  cancelAnimation,
  Easing,
  interpolateColor,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";

import { colors, radius } from "@/theme";

/**
 * The design's shimmer is a moving `surfaceHover → surfaceActive → surfaceHover` gradient (the
 * web's `.skeleton-shimmer`, 1.6 s). React Native has no CSS gradients without an extra native
 * module, so the mobile skeleton pulses between the same two tokens on the same period instead.
 * Static `surfaceHover` under "reduce motion".
 */
function useShimmer(style: StyleProp<ViewStyle>) {
  const reduceMotion = useReducedMotion();
  const progress = useSharedValue(0);

  useEffect(() => {
    if (reduceMotion) return;
    // `set`/`get` rather than `.value`: the React Compiler forbids mutating a hook's return value.
    progress.set(withRepeat(
      withTiming(1, { duration: 800, easing: Easing.inOut(Easing.ease) }),
      -1,
      true,
    ));
    return () => cancelAnimation(progress);
  }, [reduceMotion, progress]);

  const animated = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(
      progress.get(),
      [0, 1],
      [colors.surfaceHover, colors.surfaceActive],
    ),
  }));

  return [style, animated];
}

export type SkeletonProps = { style?: StyleProp<ViewStyle> };

const hidden = {
  accessibilityElementsHidden: true,
  importantForAccessibility: "no-hide-descendants",
} as const;

/** M Skeleton Line: a 12-high pill. */
function Line({ width = 140, height = 12, style }: SkeletonProps & { width?: DimensionValue; height?: number }) {
  const animated = useShimmer([{ width, height, borderRadius: radius.full }, style]);
  return <Animated.View {...hidden} style={animated} />;
}

/** M Skeleton Circle: an avatar placeholder. */
function Circle({ size = 48, style }: SkeletonProps & { size?: number }) {
  const animated = useShimmer([{ width: size, height: size, borderRadius: radius.full }, style]);
  return <Animated.View {...hidden} style={animated} />;
}

/** M Skeleton Block: a card placeholder, radius md (cards pass `radius.lg` via `style`). */
function Block({
  width = 120,
  height = 80,
  style,
}: SkeletonProps & { width?: DimensionValue; height?: DimensionValue }) {
  const animated = useShimmer([{ width, height, borderRadius: radius.md }, style]);
  return <Animated.View {...hidden} style={animated} />;
}

/**
 * Loading placeholders, hidden from screen readers — the screen that shows them announces its
 * loading state once (e.g. an `accessibilityLabel="Carregando"` on the container).
 */
export const Skeleton = { Line, Circle, Block };
