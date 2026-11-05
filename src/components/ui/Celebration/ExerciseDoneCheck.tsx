import { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import Animated, {
  Easing,
  useAnimatedProps,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import Svg, { Circle, Path } from "react-native-svg";

import { useAnnounceOnIos } from "@/lib/a11y";
import { colors, radius, sizes, withAlpha } from "@/theme";

const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const AnimatedPath = Animated.createAnimatedComponent(Path);

const EASE_OUT = Easing.bezier(0.23, 1, 0.32, 1);
const VIEW_BOX = 100;
const RING_RADIUS = 42;
const RING_LENGTH = 2 * Math.PI * RING_RADIUS;
const CHECK = "M31 52 L45 66 L71 37";
/** The check's path length, rounded up so the dash hides it whole. */
const CHECK_LENGTH = 60;
const DISC = withAlpha(colors.bg, 0.86);

/** How long it stays on screen, the fade included. */
export const EXERCISE_DONE_MS = 900;

export type ExerciseDoneCheckProps = {
  /** Read out instead of the animation: what happened and where the session went. */
  announcement: string;
  /** It finished: the parent can unmount it. */
  onDone: () => void;
};

/**
 * Level 1 of the workout's feedback: a check drawn inside a ring at the centre of the screen when
 * an exercise is done. It never takes a touch, so the next set can be ticked under it. Reduce
 * Motion keeps the fade and shows the check already drawn.
 */
export function ExerciseDoneCheck({ announcement, onDone }: ExerciseDoneCheckProps) {
  const reduceMotion = useReducedMotion();
  const opacity = useSharedValue(0);
  const scale = useSharedValue(reduceMotion ? 1 : 0.92);
  const ring = useSharedValue(reduceMotion ? 1 : 0);
  const check = useSharedValue(reduceMotion ? 1 : 0);
  useAnnounceOnIos(announcement);

  useEffect(() => {
    opacity.set(
      withSequence(
        withTiming(1, { duration: 140, easing: EASE_OUT }),
        withDelay(EXERCISE_DONE_MS - 340, withTiming(0, { duration: 200, easing: EASE_OUT })),
      ),
    );
    if (!reduceMotion) {
      scale.set(withTiming(1, { duration: 240, easing: EASE_OUT }));
      ring.set(withTiming(1, { duration: 320, easing: EASE_OUT }));
      check.set(withDelay(150, withTiming(1, { duration: 240, easing: EASE_OUT })));
    }
    const timer = setTimeout(onDone, EXERCISE_DONE_MS);
    return () => clearTimeout(timer);
    // One run per mount: the parent keys it to replay.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const frame = useAnimatedStyle(() => ({ opacity: opacity.get(), transform: [{ scale: scale.get() }] }));
  const ringProps = useAnimatedProps(() => ({ strokeDashoffset: RING_LENGTH * (1 - ring.get()) }));
  const checkProps = useAnimatedProps(() => ({ strokeDashoffset: CHECK_LENGTH * (1 - check.get()) }));

  return (
    <View
      style={styles.layer}
      pointerEvents="none"
      accessibilityLabel={announcement}
      accessibilityLiveRegion="polite"
    >
      <Animated.View style={[styles.disc, frame]} testID="exercise-done-check">
        <Svg width={sizes.celebrationCheck} height={sizes.celebrationCheck} viewBox={`0 0 ${VIEW_BOX} ${VIEW_BOX}`}>
          <AnimatedCircle
            cx={VIEW_BOX / 2}
            cy={VIEW_BOX / 2}
            r={RING_RADIUS}
            stroke={colors.success}
            strokeWidth={5}
            strokeLinecap="round"
            fill="none"
            strokeDasharray={RING_LENGTH}
            animatedProps={ringProps}
            rotation={-90}
            origin={`${VIEW_BOX / 2}, ${VIEW_BOX / 2}`}
          />
          <AnimatedPath
            d={CHECK}
            stroke={colors.success}
            strokeWidth={7}
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
            strokeDasharray={CHECK_LENGTH}
            animatedProps={checkProps}
          />
        </Svg>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  layer: { position: "absolute", top: 0, right: 0, bottom: 0, left: 0, alignItems: "center", justifyContent: "center" },
  disc: { borderRadius: radius.full, backgroundColor: DISC },
});
