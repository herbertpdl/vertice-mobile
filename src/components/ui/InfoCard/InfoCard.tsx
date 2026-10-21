import type { LucideIcon } from "lucide-react-native";
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";

import { colors, radius, sizes, space } from "@/theme";

import { Text } from "../Text";

export type InfoRowData = {
  icon: LucideIcon;
  /** Uppercase in the copy ("PERÍODO"); read as-is. */
  label: string;
  value: string;
};

export type InfoCardProps = {
  rows: InfoRowData[];
  style?: StyleProp<ViewStyle>;
};

/**
 * M Info Card of M Info Rows (plan detail): icon 18 tertiary, a 96 pt 12/600 label, the 14/600
 * value; rows separated by a 1 pt `border` rule, none after the last.
 */
export function InfoCard({ rows, style }: InfoCardProps) {
  return (
    <View style={[styles.card, style]}>
      {rows.map(({ icon: Icon, label, value }, index) => (
        <View
          key={label}
          style={[styles.row, index < rows.length - 1 ? styles.rule : null]}
          accessible
          accessibilityLabel={`${label}: ${value}`}
        >
          <Icon size={18} color={colors.textTertiary} />
          <Text variant="smallStrong" color="textSecondary" style={styles.label}>
            {label}
          </Text>
          <Text variant="bodyStrong" style={styles.value}>
            {value}
          </Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: space[1],
    paddingHorizontal: space[4],
  },
  row: { flexDirection: "row", alignItems: "center", gap: space[3], paddingVertical: sizes.infoRowPaddingVertical },
  rule: { borderBottomWidth: 1, borderBottomColor: colors.border },
  label: { width: sizes.infoLabelWidth },
  value: { flex: 1 },
});
