import { StyleSheet, View } from "react-native";

import { Text } from "@/components/ui";
import type { ExerciseProgressPoint } from "@/lib/api/types";
import { formatWeight } from "@/lib/format";
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
 * The Progresso tab's card: max weight per week (`GET /api/exercises/{id}/progress`) as M Chart
 * Bars, the last `CHART_WEEKS` weeks, scaled to the heaviest; read as one sentence by screen
 * readers.
 */
export function WeightChart({ points }: { points: ExerciseProgressPoint[] }) {
  const recent = [...points].sort((a, b) => a.weekStartDate.localeCompare(b.weekStartDate)).slice(-CHART_WEEKS);
  const max = Math.max(1, ...recent.map((p) => p.weight));
  const summary = recent.map((p) => `semana de ${weekLabel(p.weekStartDate)}: ${formatWeight(p.weight)} kg`).join(", ");
  return (
    <View style={styles.card}>
      <View style={styles.head}>
        <Text variant="bodyMdStrong" accessibilityRole="header">
          Carga máxima por semana
        </Text>
        <Text variant="caption" color="textSecondary">
          {`kg · últimas ${recent.length} ${recent.length === 1 ? "semana" : "semanas"}`}
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
  column: { flex: 1, alignItems: "center", justifyContent: "flex-end", gap: 6 },
  bar: {
    width: sizes.chartBarWidth,
    borderTopLeftRadius: radius.sm,
    borderTopRightRadius: radius.sm,
    borderBottomLeftRadius: 2,
    borderBottomRightRadius: 2,
  },
});
