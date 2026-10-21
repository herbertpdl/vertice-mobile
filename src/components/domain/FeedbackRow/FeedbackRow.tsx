import { Pressable, StyleSheet, View } from "react-native";

import { Avatar, Text } from "@/components/ui";
import type { EnrichedFeedback } from "@/lib/api/types";
import { formatRecentInstant } from "@/lib/format";
import { colors, sizes, space } from "@/theme";

export type FeedbackRowProps = {
  feedback: EnrichedFeedback;
  /** `"Hoje, 07:40"` on the full list; the dashboard shows the shorter `"07:40"` / `"Ontem"`. */
  withDay?: boolean;
  /** Opens the student. Without it the row is static. */
  onPress?: () => void;
  last?: boolean;
  /**
   * `trainer` (default): avatar + student name, "workout · plan". `student`: inside one student's
   * page — no avatar, the workout as the title and "Plano: …" under it.
   */
  perspective?: "trainer" | "student";
};

/** M Feedback Row: avatar, student, when, "workout · plan", the quoted comment. */
export function FeedbackRow({ feedback, withDay = false, onPress, last = false, perspective = "trainer" }: FeedbackRowProps) {
  const when = formatRecentInstant(feedback.createdAt, { withDay });
  const student = perspective === "student";
  const title = student ? feedback.workoutName : feedback.clientName;
  const context = student ? `Plano: ${feedback.trainingPlanName}` : `${feedback.workoutName} · ${feedback.trainingPlanName}`;
  return (
    <Pressable
      onPress={onPress}
      disabled={onPress === undefined}
      accessibilityRole={onPress === undefined ? undefined : "button"}
      accessibilityLabel={`${title}, ${when}, ${context}: ${feedback.text}`}
      style={({ pressed }) => [styles.row, last ? null : styles.rule, pressed ? styles.pressed : null]}
    >
      {student ? null : <Avatar name={feedback.clientName} size={40} />}
      <View style={styles.col}>
        <View style={styles.top}>
          <Text variant="bodyMdStrong" numberOfLines={1} style={styles.flex}>
            {title}
          </Text>
          <Text variant="small" color="textSecondary">
            {when}
          </Text>
        </View>
        <Text variant="caption" color="textSecondary" numberOfLines={1}>
          {context}
        </Text>
        <Text variant="bodyRelaxed" numberOfLines={3}>{`“${feedback.text}”`}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", gap: sizes.rowColumnGap, paddingVertical: sizes.feedbackRowPaddingVertical },
  rule: { borderBottomWidth: 1, borderBottomColor: colors.border },
  pressed: { opacity: 0.7 },
  col: { flex: 1, gap: space[1] },
  top: { flexDirection: "row", alignItems: "center", gap: space[2] },
  flex: { flex: 1 },
});
