import { StyleSheet, View } from "react-native";

import { Text } from "@/components/ui";
import type { ExerciseProgressPoint } from "@/lib/api/types";
import { addDays } from "@/lib/calendar";
import { formatWeight, todayLocalIso } from "@/lib/format";
import { colors, radius, sizes, space, withAlpha } from "@/theme";

/** How many weeks the chart shows (the design's "últimas 8 semanas"). */
export const CHART_WEEKS = 8;
/** Earlier weeks' bars: primary at `59` (~35%); the latest week is full primary. */
const PAST_FILL = withAlpha(colors.primary, 0x59 / 255);

/** "27/07" from a business date — the week's Monday, as the design labels the bars. */
function weekLabel(isoDate: string): string {
  return `${isoDate.slice(8, 10)}/${isoDate.slice(5, 7)}`;
}

/**
 * The points within the last `CHART_WEEKS` calendar weeks (today's week included), oldest first.
 * A point's `weekStartDate` is that week's Monday: this week's Monday is at most 6 days back, so
 * the 8th week back starts after `today − 56` and the 9th on or before it. Business dates compare
 * as strings; weeks with no record simply have no bar.
 */
export function recentWeeks(points: ExerciseProgressPoint[], today: string = todayLocalIso()): ExerciseProgressPoint[] {
  const cutoff = addDays(today, -CHART_WEEKS * 7);
  return points
    .filter((p) => p.weekStartDate > cutoff && p.weekStartDate <= today)
    .sort((a, b) => a.weekStartDate.localeCompare(b.weekStartDate));
}

/**
 * The Progresso tab's card: max weight per week (`GET /api/exercises/{id}/progress`) as M Chart
 * Bars over the last `CHART_WEEKS` calendar weeks, scaled from zero to the heaviest; read as one
 * sentence by screen readers. The caller shows the empty state when no week has a record.
 */
export function WeightChart({ points, today }: { points: ExerciseProgressPoint[]; today?: string }) {
  const recent = recentWeeks(points, today);
  const max = Math.max(1, ...recent.map((p) => p.weight));
  const summary = recent.map((p) => `semana de ${weekLabel(p.weekStartDate)}: ${formatWeight(p.weight)} kg`).join(", ");
  return (
    <View style={styles.card}>
      <View style={styles.head}>
        <Text variant="bodyMdStrong" accessibilityRole="header">
          Carga máxima por semana
        </Text>
        <Text variant="caption" color="textSecondary">
          {`kg · últimas ${CHART_WEEKS} semanas`}
        </Text>
      </View>
      <View style={styles.bars} accessible accessibilityRole="image" accessibilityLabel={summary}>
        {recent.map((point, index) => (
          <View key={point.weekStartDate} style={styles.column}>
            <Text variant="smallStrong" color="textSecondary" numberOfLines={1}>
              {formatWeight(point.weight)}
            </Text>
            <View
              style={[
                styles.bar,
                {
                  height: Math.max(4, (point.weight / max) * sizes.chartBarMaxHeight),
                  backgroundColor: index === recent.length - 1 ? colors.primary : PAST_FILL,
                },
              ]}
            />
            <Text variant="small" color="textSecondary" numberOfLines={1}>
              {weekLabel(point.weekStartDate)}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: space[4],
    gap: space[4],
  },
  head: { gap: space[1] },
  bars: { height: sizes.chartAreaHeight, flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between" },
  column: { flex: 1, alignItems: "center", justifyContent: "flex-end", gap: sizes.chartBarGap },
  bar: {
    width: sizes.chartBarWidth,
    borderTopLeftRadius: radius.sm,
    borderTopRightRadius: radius.sm,
    borderBottomLeftRadius: sizes.chartBarBaseRadius,
    borderBottomRightRadius: sizes.chartBarBaseRadius,
  },
});
