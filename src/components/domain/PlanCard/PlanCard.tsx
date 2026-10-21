import { ChevronRight } from "lucide-react-native";
import { Pressable, StyleSheet, View } from "react-native";

import { Badge, Text } from "@/components/ui";
import type { TrainingPlan } from "@/lib/api/types";
import { formatPlanRange } from "@/lib/format";
import { PLAN_LEVELS } from "@/lib/labels";
import { planStatus, planStatusLabels, planStatusTone } from "@/lib/plans";
import { colors, radius, sizes, space } from "@/theme";

/** M Plan Card: name, "01 mar – 24 mai · Intermediário", the status badge (from the dates), chevron. */
export function PlanCard({ plan, onPress }: { plan: Pick<TrainingPlan, "name" | "startDate" | "endDate" | "level">; onPress: () => void }) {
  const status = planStatus(plan.startDate, plan.endDate);
  const meta = `${formatPlanRange(plan.startDate, plan.endDate)} · ${PLAN_LEVELS[plan.level]}`;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${plan.name}, ${meta}, ${planStatusLabels[status]}`}
      style={({ pressed }) => [styles.card, pressed ? styles.pressed : null]}
    >
      <View style={styles.col}>
        <Text variant="bodyMdStrong">{plan.name}</Text>
        <Text variant="caption" color="textSecondary">
          {meta}
        </Text>
      </View>
      <Badge label={planStatusLabels[status]} tone={planStatusTone[status]} />
      <ChevronRight size={20} color={colors.textTertiary} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: space[3],
    paddingVertical: sizes.planCardPaddingVertical,
    paddingHorizontal: sizes.planCardPaddingHorizontal,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  pressed: { backgroundColor: colors.surfaceHover },
  col: { flex: 1, gap: sizes.planCardLinesGap },
});
