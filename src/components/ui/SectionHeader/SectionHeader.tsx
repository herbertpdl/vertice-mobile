import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";

import { controls } from "@/theme";

import { Text } from "../Text";
import { TextLink } from "../TextLink";

export type SectionHeaderProps = {
  title: string;
  /** The right-hand link ("Ver todos"). */
  action?: { label: string; onPress: () => void };
  style?: StyleProp<ViewStyle>;
};

/** M Section Header: an 18/600 Space Grotesk heading with an optional M Text Link. */
export function SectionHeader({ title, action, style }: SectionHeaderProps) {
  return (
    <View style={[styles.row, style]}>
      <Text variant="section" accessibilityRole="header" style={styles.title} numberOfLines={1}>
        {title}
      </Text>
      {action === undefined ? null : (
        <TextLink label={action.label} onPress={action.onPress} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", minHeight: controls.hitTarget },
  title: { flexShrink: 1 },
});
