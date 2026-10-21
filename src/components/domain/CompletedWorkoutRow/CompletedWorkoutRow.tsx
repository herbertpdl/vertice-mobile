import { CircleCheck } from "lucide-react-native";
import { StyleSheet, View } from "react-native";

import { Text } from "@/components/ui";
import type { DashboardData } from "@/lib/api/types";
import { formatTimeOfDay } from "@/lib/format";
import { colors, sizes, space } from "@/theme";

type CompletedWorkout = DashboardData["completedToday"][number];

/**
 * M Completed Workout Row: success check, student, workout, and when it was completed — the
 * `completedAt` instant in São Paulo time, never the deprecated `time` (the UTC clock).
 */
export function CompletedWorkoutRow({ item, last = false }: { item: CompletedWorkout; last?: boolean }) {
  const time = formatTimeOfDay(item.completedAt);
  return (
    <View
      style={[styles.row, last ? null : styles.rule]}
      accessible
      accessibilityLabel={`${item.student} concluiu ${item.workout} às ${time}`}
    >
      <CircleCheck size={20} color={colors.success} />
      <View style={styles.col}>
        <Text variant="bodyMdStrong" numberOfLines={1}>
          {item.student}
        </Text>
        <Text variant="caption" color="textSecondary" numberOfLines={1}>
          {item.workout}
        </Text>
      </View>
      <Text variant="numeric" color="textSecondary">
        {time}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: space[3],
    paddingVertical: sizes.completedRowPaddingVertical,
  },
  rule: { borderBottomWidth: 1, borderBottomColor: colors.border },
  col: { flex: 1, gap: 2 },
});
