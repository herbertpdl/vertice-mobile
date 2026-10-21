import { ChevronRight, Moon, Plus } from "lucide-react-native";
import { Pressable, StyleSheet, View } from "react-native";

import { Text } from "@/components/ui";
import type { DayOfWeek, Workout } from "@/lib/api/types";
import { DAY_ABBR, DAY_NAMES } from "@/lib/labels";
import { colors, radius, sizes, space } from "@/theme";

export type DayRowProps = {
  day: DayOfWeek;
  /** The day's workouts (a plan may hold more than one per day); empty is a rest day. */
  workouts: Workout[];
  onOpenWorkout: (workout: Workout) => void;
  /** "+ Adicionar treino" on a rest day. */
  onAddWorkout: () => void;
};

/**
 * M Day Row / M Day Row Rest: the 48 pt day chip (cyan on a training day) and the day's workout
 * cards, or "Descanso" with "+ Adicionar treino".
 */
export function DayRow({ day, workouts, onOpenWorkout, onAddWorkout }: DayRowProps) {
  const rest = workouts.length === 0;
  return (
    <View style={styles.row}>
      <View style={[styles.chip, rest ? styles.chipRest : null]} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        <Text variant="smallBold" color={rest ? "textSecondary" : "primary"}>
          {DAY_ABBR[day]}
        </Text>
      </View>
      <View style={styles.cards}>
        {rest ? (
          <Pressable
            onPress={onAddWorkout}
            accessibilityRole="button"
            accessibilityLabel={`${DAY_NAMES[day]}: descanso. Adicionar treino`}
            style={({ pressed }) => [styles.card, styles.restCard, pressed ? styles.pressed : null]}
          >
            <Moon size={14} color={colors.textSecondary} />
            <Text variant="caption" color="textSecondary" style={styles.flex}>
              Descanso
            </Text>
            <View style={styles.add}>
              <Plus size={14} color={colors.primary} />
              <Text variant="caption" color="primary" weight="semibold">
                Adicionar treino
              </Text>
            </View>
          </Pressable>
        ) : (
          workouts.map((workout) => (
            <Pressable
              key={workout.id}
              onPress={() => onOpenWorkout(workout)}
              accessibilityRole="button"
              accessibilityLabel={`${DAY_NAMES[day]}: ${workout.name}`}
              style={({ pressed }) => [styles.card, styles.workoutCard, pressed ? styles.pressed : null]}
            >
              <Text variant="bodyStrong" numberOfLines={1} style={styles.flex}>
                {workout.name}
              </Text>
              <ChevronRight size={18} color={colors.textTertiary} />
            </Pressable>
          ))
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "flex-start", gap: sizes.dayRowGap },
  chip: {
    width: sizes.dayRow,
    height: sizes.dayRow,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceActive,
    alignItems: "center",
    justifyContent: "center",
  },
  chipRest: { backgroundColor: colors.surface },
  cards: { flex: 1, gap: space[2] },
  card: {
    minHeight: sizes.dayRow,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: sizes.planCardPaddingHorizontal,
    flexDirection: "row",
    alignItems: "center",
  },
  workoutCard: { backgroundColor: colors.surface, gap: sizes.dayRowGap },
  restCard: { gap: sizes.dayRestGap },
  add: { flexDirection: "row", alignItems: "center", gap: sizes.dayRestAddGap },
  pressed: { backgroundColor: colors.surfaceHover },
  flex: { flex: 1 },
});
