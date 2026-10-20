import { BlurView } from "expo-blur";
import type { BottomTabBarProps } from "expo-router/tabs";
import { Platform, Pressable, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Text } from "@/components/ui/Text";
import { colors, overlay, radius, sizes, space, withAlpha } from "@/theme";

/** M Tab Bar's capsule fill: `surface` at `CC` (80%) — translucent over the content behind it. */
const CAPSULE_FILL = withAlpha(colors.surface, 0xcc / 255);
/** Capsule padding (6) + item (8 + 22 icon + 3 + ~16 label + 8) + padding (6). */
const CAPSULE_HEIGHT = 69;
/** M Tab Bar's padding below the capsule, above the home indicator. */
const BOTTOM_GAP = space[3];

/**
 * How much bottom padding a tab screen's scroll content needs so its last row clears the floating
 * capsule (which overlays the content, so it can blur what scrolls under it).
 */
export function tabBarInset(safeAreaBottom: number): number {
  return safeAreaBottom + BOTTOM_GAP + CAPSULE_HEIGHT + space[4];
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
      style={[styles.wrap, { paddingBottom: insets.bottom + BOTTOM_GAP }]}
      pointerEvents="box-none"
    >
      <View style={styles.capsule} accessibilityRole="tablist">
        {Platform.OS === "ios" ? (
          <BlurView tint="dark" intensity={40} style={StyleSheet.absoluteFill} />
        ) : null}
        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key];
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
              <Text variant="smallStrong" color={focused ? "primary" : "textTertiary"} numberOfLines={1}>
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
    // M Tab Bar shadow: #00000066, y 10, blur 28.
    shadowColor: overlay.shadow,
    shadowOpacity: 0.4,
    shadowOffset: { width: 0, height: 10 },
    shadowRadius: 14,
    elevation: 12,
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
