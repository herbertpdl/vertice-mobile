import type { ReactNode } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { colors, screenPaddingHorizontal, space } from "@/theme";

import { tabScreenBottomPadding } from "../TabBar";

export type ScreenProps = {
  children: ReactNode;
  /** A `NavBar`, pinned above the content. */
  header?: ReactNode;
  /** Pinned below the content, above the home indicator (bottom actions, M Save Bar). */
  footer?: ReactNode;
  /** `false` for screens that manage their own list (`FlatList`); they get no padding either. */
  scroll?: boolean;
  /** Pull to refresh. */
  refreshing?: boolean;
  onRefresh?: () => void;
  /** A tab screen: the content scrolls under the floating tab bar, so it pads for it. */
  inTabs?: boolean;
  contentStyle?: StyleProp<ViewStyle>;
};

/**
 * The frame of every screen: `bg` background, top safe area (the status bar is the device's, never
 * drawn), optional pinned header and footer, scrolling content padded 20 pt horizontally (the
 * pen.dev mobile screens' content inset) that moves out of the keyboard's way.
 */
export function Screen({
  children,
  header,
  footer,
  scroll = true,
  refreshing = false,
  onRefresh,
  inTabs = false,
  contentStyle,
}: ScreenProps) {
  const insets = useSafeAreaInsets();
  const bottom = inTabs ? tabScreenBottomPadding(insets.bottom) : footer === undefined ? insets.bottom + space[6] : space[6];

  return (
    <KeyboardAvoidingView
      style={[styles.root, { paddingTop: insets.top }]}
      // "height" on Android too: SDK 57 is edge-to-edge, so the window's adjustResize can't be
      // relied on to lift the content and footer above the keyboard.
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      {header}
      {scroll ? (
        <ScrollView
          style={styles.flex}
          contentContainerStyle={[styles.content, { paddingBottom: bottom }, contentStyle]}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
          refreshControl={
            onRefresh === undefined ? undefined : (
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor={colors.primary}
                colors={[colors.primary]}
                progressBackgroundColor={colors.surface}
              />
            )
          }
        >
          {children}
        </ScrollView>
      ) : (
        <View style={[styles.flex, contentStyle]}>{children}</View>
      )}
      {footer === undefined ? null : (
        <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, space[4]) }]}>{footer}</View>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  flex: { flex: 1 },
  content: { paddingHorizontal: screenPaddingHorizontal, paddingTop: space[2] },
  footer: { paddingHorizontal: screenPaddingHorizontal, paddingTop: space[3] },
});
