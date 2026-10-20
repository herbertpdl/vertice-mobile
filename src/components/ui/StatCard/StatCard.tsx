import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";

import { colors, radius, space, type ColorToken } from "@/theme";

import { Text } from "../Text";

export type StatCardProps = {
  label: string;
  value: string;
  /** The line under the value ("com vínculo ativo", "próximos 7 dias"). */
  helper?: string;
  /** The helper's color: `success` for good news, `warning` for attention, `info`, or neutral. */
  helperColor?: Extract<ColorToken, "success" | "warning" | "danger" | "info" | "textSecondary">;
  style?: StyleProp<ViewStyle>;
};

/** M Stat Card: label, big value in the heading face, helper line. One accessible element. */
export function StatCard({ label, value, helper, helperColor = "textSecondary", style }: StatCardProps) {
  return (
    <View
      style={[styles.card, style]}
      accessible
      accessibilityLabel={[label, value, helper].filter(Boolean).join(", ")}
    >
      <Text variant="smallStrong" color="textSecondary" numberOfLines={1}>
        {label}
      </Text>
      <Text variant="title" numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Text>
      {helper === undefined ? null : (
        <Text variant="small" color={helperColor} numberOfLines={1}>
          {helper}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: space[4],
    gap: 6,
  },
});
