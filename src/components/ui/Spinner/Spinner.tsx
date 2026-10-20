import { LoaderCircle } from "lucide-react-native";
import { useEffect } from "react";
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";

import { colors, type ColorToken } from "@/theme";

export type SpinnerProps = {
  /** Glyph size in points. M Spinner is 24; inside M Button - Loading it is 20. */
  size?: number;
  color?: ColorToken;
  /** Announced by screen readers; omit when the surrounding control already says it's busy. */
  accessibilityLabel?: string;
};

/**
 * M Spinner's glyph: a rotating lucide `loader-circle`, static under "reduce motion". The design's
 * 44×44 frame around the 24 pt glyph is layout — center the spinner in a 44 pt box where it
 * stands alone.
 */
export function Spinner({ size = 24, color = "primary", accessibilityLabel }: SpinnerProps) {
  const reduceMotion = useReducedMotion();
  const rotation = useSharedValue(0);

  useEffect(() => {
    if (reduceMotion) return;
    // `set`/`get` rather than `.value`: the React Compiler forbids mutating a hook's return value.
    rotation.set(withRepeat(withTiming(360, { duration: 900, easing: Easing.linear }), -1));
    return () => cancelAnimation(rotation);
  }, [reduceMotion, rotation]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.get()}deg` }],
  }));

  return (
    <Animated.View
      style={[{ width: size, height: size }, animatedStyle]}
      accessible={accessibilityLabel !== undefined}
      accessibilityRole={accessibilityLabel === undefined ? undefined : "progressbar"}
      accessibilityLabel={accessibilityLabel}
      importantForAccessibility={accessibilityLabel === undefined ? "no-hide-descendants" : "auto"}
    >
      <LoaderCircle size={size} color={colors[color]} />
    </Animated.View>
  );
}
