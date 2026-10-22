import { Check, ChevronRight } from "lucide-react-native";
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";

import { colors, radius, sizes, space } from "@/theme";

import { Text } from "../Text";

export type ExerciseStepState = "pending" | "current" | "done";

export type ExerciseStepRowProps = {
  /** 1-based position in the workout. */
  index: number;
  name: string;
  /** "0 de 4 séries", "Em andamento · 2 de 4 séries", "4 de 4 séries". */
  meta: string;
  state: ExerciseStepState;
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
};

/**
 * M Exercise Step Row ("Ver todos"): the exercise's index disc, name and sets progress. Done swaps
 * the index for a success check and the meta turns success; the current exercise is ringed and
 * its disc and meta go primary. Tapping jumps to the exercise.
 */
export function ExerciseStepRow({ index, name, meta, state, onPress, style }: ExerciseStepRowProps) {
  const done = state === "done";
  const current = state === "current";
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Exercício ${index}: ${name}. ${meta}`}
      accessibilityState={{ selected: current }}
      onPress={onPress}
      style={({ pressed }) => [styles.row, current ? styles.rowCurrent : null, pressed ? styles.pressed : null, style]}
    >
      <View style={[styles.disc, done ? styles.discDone : current ? styles.discCurrent : null]}>
        {done ? (
          <Check size={16} color={colors.bg} strokeWidth={3} />
        ) : (
          <Text variant="label" weight="bold" color={current ? "primaryText" : "textSecondary"} allowFontScaling={false}>
            {index}
          </Text>
        )}
      </View>
      <View style={styles.col}>
        <Text variant="bodyMdStrong" numberOfLines={1}>
          {name}
        </Text>
        <Text variant="caption" color={done ? "success" : current ? "primary" : "textSecondary"} numberOfLines={1}>
          {meta}
        </Text>
      </View>
      <ChevronRight size={18} color={colors.textTertiary} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    height: sizes.stepRowHeight,
    flexDirection: "row",
    alignItems: "center",
    gap: space[3],
    paddingHorizontal: sizes.studentCardPadding,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  rowCurrent: { borderColor: colors.primary, borderWidth: sizes.focusBorderWidth },
  pressed: { backgroundColor: colors.surfaceHover },
  disc: {
    width: sizes.stepRowIndex,
    height: sizes.stepRowIndex,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceActive,
    alignItems: "center",
    justifyContent: "center",
  },
  discDone: { backgroundColor: colors.success },
  discCurrent: { backgroundColor: colors.primary },
  col: { flex: 1, gap: sizes.rowLinesGap },
});
