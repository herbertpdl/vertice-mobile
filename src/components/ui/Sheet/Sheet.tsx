import { X } from "lucide-react-native";
import type { ReactNode } from "react";
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, View } from "react-native";
import Animated, { SlideInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { colors, overlay, radius, screenPaddingHorizontal, sizes, space } from "@/theme";

import { IconButton } from "../IconButton";
import { Text } from "../Text";

export type SheetModalProps = {
  visible: boolean;
  /** Backdrop tap, Android back, and the close button. Not called while `dismissible` is false. */
  onClose: () => void;
  /** False while a request is in flight, so the sheet can't be dismissed mid-save. */
  dismissible?: boolean;
  /** Read when the sheet opens. */
  accessibilityLabel: string;
  /** Gap between the sheet's direct children (M Bottom Sheet 20, M Action Sheet 12). */
  gap?: number;
  /** iOS only: the sheet finished animating out (see `ActionSheet`). */
  onDismiss?: () => void;
  children: ReactNode;
};

/**
 * The shell shared by `Sheet` and `ActionSheet`: a fading `#000000A8` backdrop and a `surface`
 * panel sliding up from the bottom with a 24 pt top radius, the grabber, and 34 pt (the home
 * indicator, or 20 without one) of bottom padding. Swipe-to-dismiss is not implemented: the
 * backdrop, the close button and Android's back button dismiss it.
 */
export function SheetModal({
  visible,
  onClose,
  dismissible = true,
  accessibilityLabel,
  gap = space[5],
  onDismiss,
  children,
}: SheetModalProps) {
  const insets = useSafeAreaInsets();
  const close = () => {
    if (dismissible) onClose();
  };
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      navigationBarTranslucent
      onRequestClose={close}
      onDismiss={onDismiss}
    >
      {/* "height" on Android: the modal is edge-to-edge, so adjustResize won't lift the panel. */}
      <KeyboardAvoidingView style={styles.fill} behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <Pressable
          style={[StyleSheet.absoluteFill, styles.backdrop]}
          onPress={close}
          disabled={!dismissible}
          accessible={dismissible}
          accessibilityRole="button"
          accessibilityLabel="Fechar"
        />
        <Animated.View
          entering={SlideInDown.duration(260)}
          style={[styles.panel, { gap, paddingBottom: Math.max(insets.bottom, space[5]) }]}
          accessibilityViewIsModal
          accessibilityLabel={accessibilityLabel}
        >
          <View style={styles.grabberRow}>
            <View style={styles.grabber} />
          </View>
          {children}
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

export type SheetProps = Omit<SheetModalProps, "accessibilityLabel" | "gap" | "onDismiss"> & {
  title: string;
  /** Pinned under the content (M Bottom Sheet's footer slot: Cancelar + confirm). */
  footer?: ReactNode;
  /** Scroll the content (long option lists, the forms); off for short fixed content. */
  scroll?: boolean;
};

/** M Bottom Sheet: grabber, 20/700 title with a close button, content, optional footer. */
export function Sheet({ title, footer, scroll = true, children, ...modal }: SheetProps) {
  const body = <View style={styles.content}>{children}</View>;
  return (
    <SheetModal {...modal} accessibilityLabel={title}>
      <View style={styles.head}>
        <Text variant="titleSm" style={styles.title} accessibilityRole="header">
          {title}
        </Text>
        <IconButton
          icon={X}
          variant="plain"
          color="textSecondary"
          iconSize={20}
          accessibilityLabel="Fechar"
          onPress={modal.onClose}
          disabled={modal.dismissible === false}
        />
      </View>
      {scroll ? (
        <ScrollView style={styles.scroll} keyboardShouldPersistTaps="handled" bounces={false}>
          {body}
        </ScrollView>
      ) : (
        body
      )}
      {footer === undefined ? null : <View style={styles.footer}>{footer}</View>}
    </SheetModal>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, justifyContent: "flex-end" },
  backdrop: { backgroundColor: overlay.backdrop },
  panel: {
    maxHeight: "92%",
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    borderTopWidth: 1,
    borderColor: colors.border,
    paddingTop: sizes.sheetPaddingTop,
    paddingHorizontal: screenPaddingHorizontal,
  },
  grabberRow: { alignItems: "center" },
  grabber: {
    width: sizes.grabberWidth,
    height: sizes.grabberHeight,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceActive,
  },
  head: { flexDirection: "row", alignItems: "center", gap: space[3] },
  title: { flex: 1 },
  scroll: { flexGrow: 0 },
  content: { gap: sizes.sheetContentGap },
  footer: { flexDirection: "row", gap: space[3] },
});
