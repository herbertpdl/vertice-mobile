import { StyleSheet, View } from "react-native";

import { Badge, Text } from "@/components/ui";
import type { DashboardData } from "@/lib/api/types";
import { daysLeftLabel, formatDayMonth } from "@/lib/format";
import { colors, sizes } from "@/theme";

type ExpiringPlan = DashboardData["expiringPlans"][number];

/** A plan ending within this many days gets the warning badge (M Badge Warning). */
export const ENDING_SOON_DAYS = 7;

/** M Plan Ending Row: student, "plan · termina 24 mai", the days-left badge. */
export function PlanEndingRow({ plan, last = false }: { plan: ExpiringPlan; last?: boolean }) {
  const meta = `${plan.name} · termina ${formatDayMonth(plan.end)}`;
  const days = daysLeftLabel(plan.daysLeft);
  return (
    <View style={[styles.row, last ? null : styles.rule]} accessible accessibilityLabel={`${plan.student}, ${meta}, ${days}`}>
      <View style={styles.col}>
        <Text variant="bodyMdStrong" numberOfLines={1}>
          {plan.student}
        </Text>
        <Text variant="caption" color="textSecondary" numberOfLines={1}>
          {meta}
        </Text>
      </View>
      <Badge label={days} tone={plan.daysLeft <= ENDING_SOON_DAYS ? "warning" : "neutral"} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: sizes.rowColumnGap,
    paddingVertical: sizes.planEndingRowPaddingVertical,
  },
  rule: { borderBottomWidth: 1, borderBottomColor: colors.border },
  col: { flex: 1, gap: sizes.rowLinesGap },
});
