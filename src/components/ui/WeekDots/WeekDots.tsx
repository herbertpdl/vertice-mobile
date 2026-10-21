import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";

import { colors, radius, sizes } from "@/theme";

import { Text } from "../Text";

export type WeekDay = {
  /** One letter on the dot ("S", "T", "Q"…). */
  letter: string;
  /** The full day name, for screen readers ("Segunda"). */
  name: string;
  done: boolean;
};

export type WeekDotsProps = {
  days: WeekDay[];
  style?: StyleProp<ViewStyle>;
};

/**
 * M Week Dots: one 24 pt dot per day (Mon–Fri on the roster), `success` with a `bg` letter when
 * the day's workout is done (M Week Dot Done), `surfaceHover` otherwise (M Week Dot). Read as one
 * sentence: "Esta semana: Segunda concluído, Terça pendente, …".
 */
/** "Esta semana: Segunda concluído, Terça pendente" — how the dots are read. */
export function weekSummary(days: WeekDay[]): string {
  return `Esta semana: ${days.map((d) => `${d.name} ${d.done ? "concluído" : "pendente"}`).join(", ")}`;
}

export function WeekDots({ days, style }: WeekDotsProps) {
  return (
    <View style={[styles.row, style]} accessible accessibilityLabel={weekSummary(days)}>
      {days.map((day) => (
        <View key={day.name} style={[styles.dot, day.done ? styles.done : null]}>
          <Text variant="smallBold" color={day.done ? "bg" : "textSecondary"} allowFontScaling={false}>
            {day.letter}
          </Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: sizes.weekDotGap },
  dot: {
    width: sizes.weekDot,
    height: sizes.weekDot,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceHover,
    alignItems: "center",
    justifyContent: "center",
  },
  done: { backgroundColor: colors.success },
});
