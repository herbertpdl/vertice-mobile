import { ChevronRight, Timer } from "lucide-react-native";
import { Pressable, StyleSheet, View } from "react-native";

import { Avatar, Text, WeekDots, weekSummary } from "@/components/ui";
import type { ClientSummary } from "@/lib/api/types";
import { formatRecentInstant } from "@/lib/format";
import { DAY_INITIAL, DAY_NAMES } from "@/lib/labels";
import { colors, radius, sizes, space } from "@/theme";

/**
 * M Student Card: avatar, name, current plan ("Sem plano ativo" in warning), this week's last
 * workout ("Sem treino nesta semana" — the BFF only reports the current week) and the Mon–Fri
 * M Week Dots.
 */
export function StudentCard({ student, onPress }: { student: ClientSummary; onPress: () => void }) {
  const plan = student.currentPlan?.name ?? "Sem plano ativo";
  const last =
    student.lastWorkoutAt === null ? "Sem treino nesta semana" : formatRecentInstant(student.lastWorkoutAt, { withDay: true });
  const days = student.weekActivity.map((day) => ({
    letter: DAY_INITIAL[day.dayOfWeek],
    name: DAY_NAMES[day.dayOfWeek],
    done: day.completed,
  }));
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      // One element for the whole card, so the week (otherwise hidden inside it) is read too.
      accessibilityLabel={`${student.name}, ${plan}, último treino: ${last}. ${weekSummary(days)}`}
      style={({ pressed }) => [styles.card, pressed ? styles.pressed : null]}
    >
      <View style={styles.top}>
        <Avatar name={student.name} size={48} />
        <View style={styles.identity}>
          <Text variant="bodyLgStrong" numberOfLines={1}>
            {student.name}
          </Text>
          <Text variant="caption" color={student.currentPlan === null ? "warning" : "textSecondary"} numberOfLines={1}>
            {plan}
          </Text>
        </View>
        <ChevronRight size={20} color={colors.textTertiary} />
      </View>
      <View style={styles.bottom}>
        <View style={styles.last}>
          <Timer size={14} color={colors.textSecondary} />
          <Text variant="caption" color="textSecondary" style={styles.flex} numberOfLines={2}>
            {last}
          </Text>
        </View>
        <WeekDots days={days} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: sizes.studentCardPadding,
    gap: space[3],
  },
  pressed: { backgroundColor: colors.surfaceHover },
  top: { flexDirection: "row", alignItems: "center", gap: space[3] },
  identity: { flex: 1, gap: sizes.rowLinesGap },
  bottom: { flexDirection: "row", alignItems: "center", gap: space[3] },
  last: { flex: 1, flexDirection: "row", alignItems: "center", gap: sizes.inlineLinkGap },
  flex: { flex: 1 },
});
