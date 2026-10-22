import { Check } from "lucide-react-native";
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";

import { colors, radius, sizes, TINT_ALPHA, withAlpha } from "@/theme";

import { Text } from "../Text";

/** `done`: a workout for the day was finished this week; `rest`: the plan has none that weekday. */
export type WeekDayState = "done" | "today" | "pending" | "rest";

export type WeekStripDay = {
  /** "SEG", "TER"… */
  label: string;
  /** The day of the month ("22"). */
  dayNumber: string;
  /** The full day name, for screen readers ("Segunda"). */
  name: string;
  state: WeekDayState;
};

export type WeekStripProps = {
  days: WeekStripDay[];
  style?: StyleProp<ViewStyle>;
};

const SPOKEN: Record<WeekDayState, string> = {
  done: "concluído",
  today: "hoje",
  pending: "pendente",
  rest: "descanso",
};

/** "Esta semana: Segunda concluído, Terça descanso, Quarta hoje, …" — how the strip is read. */
export function weekStripSummary(days: WeekStripDay[]): string {
  return `Esta semana: ${days.map((d) => `${d.name} ${SPOKEN[d.state]}`).join(", ")}`;
}

/**
 * M Week Strip: Monday → Sunday as M Week Day columns — the day label over a 36 pt circle with the
 * day's number. Done is a success disc with a check (M Week Day Done); today a cyan-tinted ring
 * (M Week Day Today); a rest day an outlined, dimmed circle (M Week Day Rest); pending the plain
 * `surfaceHover` disc. Read as one sentence.
 */
export function WeekStrip({ days, style }: WeekStripProps) {
  return (
    <View style={[styles.row, style]} accessible accessibilityLabel={weekStripSummary(days)}>
      {days.map((day) => (
        <View key={day.label} style={styles.day}>
          <Text
            variant="tiny"
            color={day.state === "today" ? "primary" : day.state === "rest" ? "textTertiary" : "textSecondary"}
            allowFontScaling={false}
          >
            {day.label}
          </Text>
          <View style={[styles.circle, circleStyles[day.state]]}>
            {day.state === "done" ? (
              <Check size={18} color={colors.bg} strokeWidth={3} />
            ) : (
              <Text
                variant="bodyStrong"
                weight={day.state === "today" ? "bold" : day.state === "rest" ? "regular" : "semibold"}
                color={day.state === "today" ? "primary" : day.state === "rest" ? "textTertiary" : "textPrimary"}
                allowFontScaling={false}
              >
                {day.dayNumber}
              </Text>
            )}
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", justifyContent: "space-between" },
  day: { width: sizes.weekDayWidth, alignItems: "center", gap: sizes.weekDayGap },
  circle: {
    width: sizes.weekDayCircle,
    height: sizes.weekDayCircle,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
  },
});

const circleStyles = StyleSheet.create({
  done: { backgroundColor: colors.success },
  today: { backgroundColor: withAlpha(colors.primary, TINT_ALPHA), borderWidth: sizes.focusBorderWidth, borderColor: colors.primary },
  pending: { backgroundColor: colors.surfaceHover },
  rest: { borderWidth: 1, borderColor: colors.border },
});
