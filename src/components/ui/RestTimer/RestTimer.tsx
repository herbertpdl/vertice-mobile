import { Timer } from "lucide-react-native";
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";

import { colors, radius, shadows, sizes, space, TINT_ALPHA, withAlpha } from "@/theme";

import { ProgressBar } from "../ProgressBar";
import { Text } from "../Text";

/** M Rest Timer's ring (primary at `59`) and icon disc (primary at `1F`). */
const RING = withAlpha(colors.primary, 0x59 / 255);
const ICON_FILL = withAlpha(colors.primary, TINT_ALPHA);

export type RestTimerProps = {
  /** "0:47". */
  remaining: string;
  /** Share of the rest already elapsed, 0–1 (the bar fills as the rest runs out). */
  progress: number;
  /** "Próxima: série 3 · 12 reps", "Continua contando". */
  caption: string;
  /** Drop the shadow when docked inside a sheet (M - Ver Execução). */
  flat?: boolean;
  style?: StyleProp<ViewStyle>;
};

/**
 * M Rest Timer: "DESCANSO", what comes next and the countdown, over a progress bar. It has no
 * buttons — the rest can't be skipped or changed (R47); ticking the next set ends it. Announced
 * politely as the countdown changes only through its label, not every second.
 */
export function RestTimer({ remaining, progress, caption, flat = false, style }: RestTimerProps) {
  return (
    <View
      style={[styles.card, flat ? null : shadows.restTimer, style]}
      accessible
      accessibilityRole="timer"
      accessibilityLabel={`Descanso: ${remaining}. ${caption}`}
    >
      <View style={styles.top}>
        <View style={styles.icon}>
          <Timer size={22} color={colors.primary} />
        </View>
        <View style={styles.col}>
          <Text variant="eyebrow" color="primary">
            DESCANSO
          </Text>
          <Text variant="caption" color="textSecondary" numberOfLines={1}>
            {caption}
          </Text>
        </View>
        <Text variant="timer" allowFontScaling={false}>
          {remaining}
        </Text>
      </View>
      <ProgressBar value={progress} accessibilityLabel="Descanso decorrido" />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: space[3],
    padding: space[4],
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: RING,
    backgroundColor: colors.surfaceActive,
  },
  top: { flexDirection: "row", alignItems: "center", gap: sizes.rowColumnGap },
  icon: {
    width: sizes.restTimerIcon,
    height: sizes.restTimerIcon,
    borderRadius: radius.full,
    backgroundColor: ICON_FILL,
    alignItems: "center",
    justifyContent: "center",
  },
  col: { flex: 1, gap: sizes.rowLinesGapTight },
});
