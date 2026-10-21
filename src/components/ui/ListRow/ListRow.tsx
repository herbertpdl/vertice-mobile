import { ChevronRight, ExternalLink, type LucideIcon } from "lucide-react-native";
import { Pressable, StyleSheet, type PressableProps } from "react-native";

import { colors, sizes, space } from "@/theme";

import { Text } from "../Text";

export type ListRowProps = Omit<PressableProps, "children" | "style"> & {
  icon: LucideIcon;
  label: string;
  /** M List Row Danger: icon and label in danger, no chevron. */
  danger?: boolean;
  /** Drops the bottom rule (the last row of a group). */
  last?: boolean;
  /**
   * `link` when the row leaves the app (legal pages): read as a link, with the `external-link`
   * glyph in place of the chevron. Defaults to `button`.
   */
  role?: "button" | "link";
};

/** M List Row: a 56 pt settings/action row — icon 20, 16 label, chevron 18. */
export function ListRow({ icon: Icon, label, danger = false, last = false, role = "button", ...rest }: ListRowProps) {
  return (
    <Pressable
      {...rest}
      accessibilityRole={role}
      accessibilityLabel={label}
      style={({ pressed }) => [
        styles.row,
        last ? null : styles.rule,
        pressed ? styles.pressed : null,
      ]}
    >
      <Icon size={20} color={danger ? colors.danger : colors.textSecondary} />
      <Text variant="bodyLg" color={danger ? "danger" : "textPrimary"} style={styles.label} numberOfLines={1}>
        {label}
      </Text>
      {danger ? null : role === "link" ? (
        <ExternalLink size={18} color={colors.textTertiary} />
      ) : (
        <ChevronRight size={18} color={colors.textTertiary} />
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: sizes.listRowHeight,
    flexDirection: "row",
    alignItems: "center",
    gap: sizes.listRowGap,
    paddingHorizontal: space[4],
  },
  rule: { borderBottomWidth: 1, borderBottomColor: colors.border },
  pressed: { backgroundColor: colors.surfaceHover },
  label: { flex: 1 },
});
