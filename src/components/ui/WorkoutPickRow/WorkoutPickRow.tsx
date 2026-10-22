import { ChevronRight } from "lucide-react-native";
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";

import { colors, disabledOpacity, radius, sizes, TINT_ALPHA, withAlpha } from "@/theme";

import { Badge } from "../Badge";
import { Text } from "../Text";

/** `done`: finished this week (tapping offers to redo it); `unavailable`: no exercises. */
export type WorkoutPickState = "default" | "today" | "done" | "unavailable";

export type WorkoutPickRowProps = {
  /** "SEG", "QUA"… */
  day: string;
  /** The full day name, for screen readers ("Segunda"). */
  dayName: string;
  name: string;
  /** "6 exercícios", "Feito esta semana", "Sem exercícios". */
  meta: string;
  state: WorkoutPickState;
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
};

/**
 * M Workout Pick Row (the "Escolher treino" sheet): a 52 × 60 day chip beside the workout card.
 * Today's chip is filled primary and its card ringed; a done workout gets a success chip and a
 * "Feito" badge; an unavailable one (no exercises) is faded and can't be picked.
 */
export function WorkoutPickRow({ day, dayName, name, meta, state, onPress, style }: WorkoutPickRowProps) {
  const unavailable = state === "unavailable";
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${dayName}: ${name}. ${meta}`}
      accessibilityState={{ disabled: unavailable }}
      disabled={unavailable}
      onPress={onPress}
      style={[styles.row, unavailable ? styles.unavailable : null, style]}
    >
      {({ pressed }) => (
        <>
      <View style={[styles.chip, chipStyles[state]]}>
        <Text
          variant="smallBold"
          color={state === "today" ? "primaryText" : state === "done" ? "success" : "textSecondary"}
          allowFontScaling={false}
        >
          {day}
        </Text>
      </View>
      <View style={[styles.card, state === "today" ? styles.cardToday : null, pressed ? styles.pressed : null]}>
        <View style={styles.col}>
          <Text variant="bodyMdStrong" numberOfLines={1}>
            {name}
          </Text>
          <Text variant="caption" color="textSecondary" numberOfLines={1}>
            {meta}
          </Text>
        </View>
        {state === "done" ? <Badge tone="success" label="Feito" style={styles.badge} /> : null}
        {unavailable ? null : <ChevronRight size={18} color={colors.textTertiary} />}
      </View>
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: sizes.dayRowGap },
  unavailable: { opacity: disabledOpacity.pickRow },
  pressed: { backgroundColor: colors.surfaceHover },
  chip: {
    width: sizes.pickChipWidth,
    height: sizes.pickRowHeight,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  card: {
    flex: 1,
    height: sizes.pickRowHeight,
    flexDirection: "row",
    alignItems: "center",
    gap: sizes.dayRowGap,
    paddingHorizontal: sizes.studentCardPadding,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  cardToday: { borderColor: colors.primary },
  col: { flex: 1, gap: sizes.rowLinesGap },
  badge: { alignSelf: "center" },
});

const chipStyles = StyleSheet.create({
  default: { backgroundColor: colors.surfaceActive },
  unavailable: { backgroundColor: colors.surfaceActive },
  today: { backgroundColor: colors.primary },
  done: { backgroundColor: withAlpha(colors.success, TINT_ALPHA) },
});
