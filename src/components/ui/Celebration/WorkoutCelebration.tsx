import * as Haptics from "expo-haptics";
import { useEffect } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import Animated, {
  Easing,
  useAnimatedProps,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withTiming,
  type SharedValue,
} from "react-native-reanimated";
import Svg, { Circle } from "react-native-svg";

import { useAnnounceOnIos } from "@/lib/a11y";
import { colors, sizes, space } from "@/theme";

import { LogoMark } from "../Logo";
import { Text } from "../Text";

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

const EASE_OUT = Easing.bezier(0.23, 1, 0.32, 1);
const VIEW_BOX = 100;
const RING_RADIUS = 46;
const RING_LENGTH = 2 * Math.PI * RING_RADIUS;
const SPARKS = 16;
/** The app's accents, in turn around the burst. */
const SPARK_COLORS = [colors.primary, colors.success, colors.secondary];

/** How long it stays before moving on by itself. */
export const CELEBRATION_MS = 2400;
export const CELEBRATION_REDUCED_MS = 1500;

function Spark({ index, burst }: { index: number; burst: SharedValue<number> }) {
  const angle = (index / SPARKS) * 2 * Math.PI;
  // Alternating reach, so the burst reads as sparks and not a ring.
  const reach = sizes.celebrationRing * (index % 2 === 0 ? 1 : 0.76);
  const style = useAnimatedStyle(() => {
    const at = burst.get();
    return {
      opacity: at < 0.6 ? 1 : (1 - at) / 0.4,
      transform: [
        { translateX: Math.cos(angle) * reach * at },
        { translateY: Math.sin(angle) * reach * at },
        { rotate: "45deg" },
        { scale: 1 - at * 0.5 },
      ],
    };
  });
  return <Animated.View style={[styles.spark, { backgroundColor: SPARK_COLORS[index % SPARK_COLORS.length] }, style]} />;
}

export type WorkoutCelebrationProps = {
  /** It ended, or the client tapped it: time to go on. */
  onDone: () => void;
};

/**
 * Level 2 of the workout's feedback, once a feedback is sent: the Vertice mark inside a ring drawn
 * in success, a burst of sparks in the app's accents, and the title. A tap skips it. Reduce Motion
 * shows the mark and title with a fade only.
 */
export function WorkoutCelebration({ onDone }: WorkoutCelebrationProps) {
  const reduceMotion = useReducedMotion();
  const fade = useSharedValue(0);
  const ring = useSharedValue(reduceMotion ? 1 : 0);
  const mark = useSharedValue(reduceMotion ? 1 : 0.9);
  const burst = useSharedValue(0);
  const title = useSharedValue(reduceMotion ? 1 : 0);
  useAnnounceOnIos("Treino concluído!");

  useEffect(() => {
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    fade.set(withTiming(1, { duration: 200, easing: EASE_OUT }));
    if (!reduceMotion) {
      ring.set(withTiming(1, { duration: 520, easing: EASE_OUT }));
      mark.set(withTiming(1, { duration: 420, easing: EASE_OUT }));
      burst.set(withDelay(260, withTiming(1, { duration: 900, easing: EASE_OUT })));
      title.set(withDelay(380, withTiming(1, { duration: 300, easing: EASE_OUT })));
    }
    const timer = setTimeout(onDone, reduceMotion ? CELEBRATION_REDUCED_MS : CELEBRATION_MS);
    return () => clearTimeout(timer);
    // One run per mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const layer = useAnimatedStyle(() => ({ opacity: fade.get() }));
  const markStyle = useAnimatedStyle(() => ({ transform: [{ scale: mark.get() }] }));
  const titleStyle = useAnimatedStyle(() => ({
    opacity: title.get(),
    transform: [{ translateY: (1 - title.get()) * space[2] }],
  }));
  const ringProps = useAnimatedProps(() => ({ strokeDashoffset: RING_LENGTH * (1 - ring.get()) }));

  return (
    <Animated.View style={[styles.layer, layer]}>
      <Pressable style={styles.fill} onPress={onDone} accessibilityRole="button" accessibilityLabel="Treino concluído! Continuar">
        <View style={styles.centre}>
          {reduceMotion ? null : Array.from({ length: SPARKS }, (_, i) => <Spark key={i} index={i} burst={burst} />)}
          <Svg width={sizes.celebrationRing} height={sizes.celebrationRing} viewBox={`0 0 ${VIEW_BOX} ${VIEW_BOX}`}>
            <AnimatedCircle
              cx={VIEW_BOX / 2}
              cy={VIEW_BOX / 2}
              r={RING_RADIUS}
              stroke={colors.success}
              strokeWidth={3}
              strokeLinecap="round"
              fill="none"
              strokeDasharray={RING_LENGTH}
              animatedProps={ringProps}
              rotation={-90}
              origin={`${VIEW_BOX / 2}, ${VIEW_BOX / 2}`}
            />
          </Svg>
          <Animated.View style={[styles.mark, markStyle]}>
            <LogoMark size={sizes.celebrationMark} />
          </Animated.View>
        </View>
        <Animated.View style={[styles.copy, titleStyle]}>
          <Text variant="title" align="center">
            Treino concluído!
          </Text>
          <Text variant="body" color="textSecondary" align="center">
            Bom trabalho.
          </Text>
        </Animated.View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  layer: { position: "absolute", top: 0, right: 0, bottom: 0, left: 0, backgroundColor: colors.bg },
  fill: { flex: 1, alignItems: "center", justifyContent: "center", gap: space[8] },
  centre: { alignItems: "center", justifyContent: "center" },
  mark: { position: "absolute" },
  spark: { position: "absolute", width: space[2], height: space[2] },
  copy: { gap: space[2] },
});
