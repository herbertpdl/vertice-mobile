import { BlurView } from "expo-blur";
import type { BottomTabBarProps } from "expo-router/tabs";
import { Platform, Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Text } from "@/components/ui/Text";
import { colors, radius, shadows, sizes, space, TAB_LABEL_MAX_SCALE, tabBarInset, withAlpha } from "@/theme";

/** M Tab Bar's capsule fill: `surface` at `CC` (80%) — translucent over the content behind it. */
const CAPSULE_FILL = withAlpha(colors.surface, 0xcc / 255);
/**
 * How much bottom padding a tab screen's scroll content needs so its last row clears the floating
 * capsule (which overlays the content, so it can blur what scrolls under it).
 */
export function tabScreenBottomPadding(safeAreaBottom: number): number {
  return tabBarInset(safeAreaBottom) + space[4];
}

/** Routes hidden from the bar (expo-router's `href: null` sets `tabBarItemStyle.display: "none"`). */
function isHidden(itemStyle: StyleProp<ViewStyle>): boolean {
  return StyleSheet.flatten(itemStyle)?.display === "none";
}

/**
 * M Tab Bar: a floating capsule (blurred on iOS; the translucent fill alone on Android, where
 * real blur costs frames) with one pill per tab. Used as `<Tabs tabBar={(p) => <TabBar {...p} />}>`;
 * each tab sets `title` and `tabBarIcon`.
 */
export function TabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[styles.wrap, { paddingBottom: insets.bottom + sizes.tabBarBottomGap }]}
      pointerEvents="box-none"
    >
      <View style={styles.capsule} accessibilityRole="tablist">
        {Platform.OS === "ios" ? (
          <BlurView tint="dark" intensity={40} style={StyleSheet.absoluteFill} />
        ) : null}
        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key];
          if (isHidden(options.tabBarItemStyle)) return null;
          const focused = state.index === index;
          const label = options.title ?? route.name;
          const tint = focused ? colors.primary : colors.textTertiary;

          const onPress = () => {
            const event = navigation.emit({ type: "tabPress", target: route.key, canPreventDefault: true });
            if (!focused && !event.defaultPrevented) navigation.navigate(route.name, route.params);
          };

          return (
            <Pressable
              key={route.key}
              accessibilityRole="tab"
              accessibilityLabel={options.tabBarAccessibilityLabel ?? label}
              accessibilityState={{ selected: focused }}
              onPress={onPress}
              onLongPress={() => navigation.emit({ type: "tabLongPress", target: route.key })}
              style={[styles.item, focused ? styles.itemFocused : null]}
            >
              {options.tabBarIcon?.({ focused, color: tint, size: 22 })}
              <Text
                variant="smallStrong"
                color={focused ? "primary" : "textTertiary"}
                numberOfLines={1}
                maxFontSizeMultiplier={TAB_LABEL_MAX_SCALE}
              >
                {label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: space[4],
  },
  capsule: {
    flexDirection: "row",
    gap: sizes.segmentedGap,
    padding: sizes.tabCapsulePadding,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: CAPSULE_FILL,
    overflow: "hidden",
    ...shadows.tabBar,
  },
  item: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: sizes.tabItemGap,
    paddingVertical: space[2],
    borderRadius: sizes.tabItemRadius,
  },
  itemFocused: { backgroundColor: colors.surfaceActive },
});
