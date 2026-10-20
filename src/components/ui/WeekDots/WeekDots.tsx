import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";

import { colors, radius } from "@/theme";

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
export function WeekDots({ days, style }: WeekDotsProps) {
  const summary = days.map((d) => `${d.name} ${d.done ? "concluído" : "pendente"}`).join(", ");
  return (
    <View
      style={[styles.row, style]}
      accessible
      accessibilityLabel={`Esta semana: ${summary}`}
    >
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
  row: { flexDirection: "row", alignItems: "center", gap: 6 },
  dot: {
    width: 24,
    height: 24,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceHover,
    alignItems: "center",
    justifyContent: "center",
  },
  done: { backgroundColor: colors.success },
});
