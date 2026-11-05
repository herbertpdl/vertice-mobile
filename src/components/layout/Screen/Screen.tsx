import { useState, type ReactNode, type Ref } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { KeyboardAwareScrollView, KeyboardStickyView, type KeyboardAwareScrollViewRef } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { colors, screenPaddingHorizontal, sizes, space } from "@/theme";

import { tabScreenBottomPadding } from "../TabBar";

export type ScreenProps = {
  children: ReactNode;
  /** A `NavBar`, pinned above the content. */
  header?: ReactNode;
  /** Pinned below the content, above the home indicator (bottom actions, M Save Bar). */
  footer?: ReactNode;
  /** The footer's frame (M Save Bar draws a `surface` band with a top border). */
  footerStyle?: StyleProp<ViewStyle>;
  /** `false` for screens that manage their own list (`FlatList`); they get no padding either. */
  scroll?: boolean;
  /** Pull to refresh. */
  refreshing?: boolean;
  onRefresh?: () => void;
  /** A tab screen: the content scrolls under the floating tab bar, so it pads for it. */
  inTabs?: boolean;
  contentStyle?: StyleProp<ViewStyle>;
  /** The content's scroll view, to bring it back to the top when what it shows changes. */
  scrollRef?: Ref<KeyboardAwareScrollViewRef>;
};

/**
 * The frame of every screen: `bg` background, top safe area (the status bar is the device's, never
 * drawn), optional pinned header and footer, and scrolling content padded 20 pt horizontally (the
 * pen.dev mobile screens' content inset). The focused field stays in view above the keyboard, the
 * `KeyboardBar` and the footer, which rides on top of the keyboard.
 */
export function Screen({
  children,
  header,
  footer,
  footerStyle,
  scroll = true,
  refreshing = false,
  onRefresh,
  inTabs = false,
  contentStyle,
  scrollRef,
}: ScreenProps) {
  const insets = useSafeAreaInsets();
  const [footerHeight, setFooterHeight] = useState(0);
  const bottom = inTabs ? tabScreenBottomPadding(insets.bottom) : footer === undefined ? insets.bottom + space[6] : space[6];
  const footerPadding = Math.max(insets.bottom, space[4]);
  const footerBox =
    footer === undefined ? null : (
      <View
        style={[styles.footer, { paddingBottom: footerPadding }, footerStyle]}
        onLayout={(event) => setFooterHeight(event.nativeEvent.layout.height)}
      >
        {footer}
      </View>
    );

  if (!scroll) {
    return (
      <KeyboardAvoidingView
        style={[styles.root, { paddingTop: insets.top }]}
        // "height" on Android too: SDK 57 is edge-to-edge, so the window's adjustResize can't be
        // relied on to lift the content and footer above the keyboard.
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        // The footer stops above `KeyboardBar`, not under it.
        keyboardVerticalOffset={sizes.keyboardBarHeight}
      >
        {header}
        <View style={[styles.flex, contentStyle]}>{children}</View>
        {footerBox}
      </KeyboardAvoidingView>
    );
  }

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      {header}
      <KeyboardAwareScrollView
        ref={scrollRef}
        style={styles.flex}
        contentContainerStyle={[styles.content, { paddingBottom: bottom }, contentStyle]}
        // What covers the content over the keyboard: the bar and the footer. The footer's own bottom
        // padding sinks behind the bar.
        bottomOffset={sizes.keyboardBarHeight + Math.max(0, footerHeight - footerPadding) + space[4]}
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
      </KeyboardAwareScrollView>
      {footerBox === null ? null : (
        <KeyboardStickyView style={styles.sticky} offset={{ opened: footerPadding - sizes.keyboardBarHeight - space[2] }}>
          {footerBox}
        </KeyboardStickyView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  flex: { flex: 1 },
  content: { paddingHorizontal: screenPaddingHorizontal, paddingTop: space[2] },
  footer: { paddingHorizontal: screenPaddingHorizontal, paddingTop: space[3] },
  // Opaque: lifted with the keyboard, it passes over the content.
  sticky: { backgroundColor: colors.bg },
});
