import { ChevronLeft, ChevronRight } from "lucide-react-native";
import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";

import { isInMonth, isWithin, monthGrid, monthOf, shiftMonth, firstDayOfMonth } from "@/lib/calendar";
import { formatDateLong, formatMonthTitle, todayLocalIso } from "@/lib/format";
import { CALENDAR_DAY_ORDER, DAY_INITIAL, DAY_NAMES } from "@/lib/labels";
import { colors, radius, sizes, space } from "@/theme";

import { IconButton } from "../IconButton";
import { Text } from "../Text";

export type CalendarProps = {
  /** The selected business date (`yyyy-MM-dd`), or null. */
  value: string | null;
  onChange: (isoDate: string) => void;
  /** Inclusive bounds (`yyyy-MM-dd`); days outside them can't be chosen. */
  min?: string;
  max?: string;
};

/**
 * M Calendar: month title with prev/next, Sunday-first weekday initials, and six rows of 44 pt
 * day cells (`monthGrid`, so the height never changes between months). Selected = primary disc,
 * today = primary ring, other months = tertiary. Business dates only — no `Date` crosses this
 * component's boundary (see `src/lib/calendar.ts`).
 */
export function Calendar({ value, onChange, min, max }: CalendarProps) {
  const today = todayLocalIso();
  const [month, setMonth] = useState(() => monthOf(value ?? today));
  const title = formatMonthTitle(firstDayOfMonth(month));

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <Text variant="headingSm" weight="semibold" style={styles.title} accessibilityRole="header" accessibilityLiveRegion="polite">
          {title}
        </Text>
        <IconButton
          icon={ChevronLeft}
          variant="plain"
          iconSize={20}
          accessibilityLabel="Mês anterior"
          onPress={() => setMonth((m) => shiftMonth(m, -1))}
        />
        <IconButton
          icon={ChevronRight}
          variant="plain"
          iconSize={20}
          accessibilityLabel="Próximo mês"
          onPress={() => setMonth((m) => shiftMonth(m, 1))}
        />
      </View>
      <View style={styles.week} importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
        {CALENDAR_DAY_ORDER.map((day) => (
          <View key={day} style={styles.weekday}>
            <Text variant="smallStrong" color="textSecondary">
              {DAY_INITIAL[day]}
            </Text>
          </View>
        ))}
      </View>
      {monthGrid(month).map((row) => (
        <View key={row[0]} style={styles.week}>
          {row.map((day, column) => {
            const inMonth = isInMonth(day, month);
            const enabled = isWithin(day, min, max);
            const selected = day === value;
            const isToday = day === today;
            return (
              <Pressable
                key={day}
                style={styles.cell}
                disabled={!enabled}
                onPress={() => onChange(day)}
                accessibilityRole="button"
                accessibilityLabel={`${DAY_NAMES[CALENDAR_DAY_ORDER[column]]}, ${formatDateLong(day)}${isToday ? ", hoje" : ""}`}
                accessibilityState={{ selected, disabled: !enabled }}
              >
                <View style={[styles.day, selected ? styles.selected : isToday ? styles.today : null]}>
                  <Text
                    variant="bodyMd"
                    weight={selected || isToday ? "bold" : undefined}
                    color={selected ? "primaryText" : inMonth && enabled ? "textPrimary" : "textTertiary"}
                  >
                    {String(Number(day.slice(8)))}
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: space[2] },
  header: { flexDirection: "row", alignItems: "center", gap: space[2] },
  title: { flex: 1 },
  week: { flexDirection: "row" },
  weekday: { flex: 1, height: sizes.calendarWeekdayHeight, alignItems: "center", justifyContent: "center" },
  cell: { flex: 1, height: sizes.calendarCell, alignItems: "center", justifyContent: "center" },
  day: {
    width: sizes.calendarDay,
    height: sizes.calendarDay,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
  },
  selected: { backgroundColor: colors.primary },
  today: { borderWidth: 1, borderColor: colors.primary },
});
