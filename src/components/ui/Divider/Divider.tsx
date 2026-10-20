import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";

import { colors, controls } from "@/theme";

import { Text } from "../Text";

export type DividerProps = {
  /** M Divider Or: a centered word between two rules ("ou"). */
  label?: string;
  style?: StyleProp<ViewStyle>;
};

/** M Divider: a 1 pt `border` rule, or M Divider Or with a label. */
export function Divider({ label, style }: DividerProps) {
  if (label === undefined) {
    return <View style={[styles.rule, style]} accessibilityElementsHidden importantForAccessibility="no" />;
  }
  return (
    <View style={[styles.row, style]}>
      <View style={[styles.rule, styles.flex]} />
      <Text variant="caption" color="textTertiary">
        {label}
      </Text>
      <View style={[styles.rule, styles.flex]} />
    </View>
  );
}

const styles = StyleSheet.create({
  rule: { height: 1, backgroundColor: colors.border },
  row: { flexDirection: "row", alignItems: "center", gap: controls.dividerLabelGap },
  flex: { flex: 1 },
});
