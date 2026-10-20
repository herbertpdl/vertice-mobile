import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";

import { colors, controls, radius, sizes, space } from "@/theme";

import { CountPill } from "../Badge";
import { Text } from "../Text";

export type SegmentedTab<K extends string> = {
  key: K;
  label: string;
  /** M Segmented Count: the cyan pill after the label (unread feedbacks). Hidden at 0. */
  count?: number;
};

export type SegmentedTabsProps<K extends string> = {
  tabs: SegmentedTab<K>[];
  value: K;
  onChange: (key: K) => void;
  style?: StyleProp<ViewStyle>;
};

/**
 * M Segmented Tabs: a `surface` pill track; the selected M Segmented Item is a `surfaceActive`
 * pill with a primary-text label, the others are transparent with a secondary label.
 */
export function SegmentedTabs<K extends string>({ tabs, value, onChange, style }: SegmentedTabsProps<K>) {
  return (
    <View style={[styles.track, style]} accessibilityRole="tablist">
      {tabs.map((tab) => {
        const selected = tab.key === value;
        const count = tab.count ?? 0;
        return (
          <Pressable
            key={tab.key}
            accessibilityRole="tab"
            accessibilityLabel={count > 0 ? `${tab.label}, ${count}` : tab.label}
            accessibilityState={{ selected }}
            onPress={() => onChange(tab.key)}
            style={[styles.item, selected ? styles.selected : null]}
          >
            <Text variant="bodyStrong" color={selected ? "textPrimary" : "textSecondary"} numberOfLines={1}>
              {tab.label}
            </Text>
            {count > 0 ? <CountPill count={count} /> : null}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    flexDirection: "row",
    gap: sizes.segmentedGap,
    padding: space[1],
    borderRadius: radius.full,
    backgroundColor: colors.surface,
  },
  item: {
    flex: 1,
    height: controls.hitTarget,
    borderRadius: radius.full,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: sizes.segmentedItemGap,
  },
  selected: { backgroundColor: colors.surfaceActive },
});
