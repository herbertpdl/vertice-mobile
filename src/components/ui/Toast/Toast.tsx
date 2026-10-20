import { CircleAlert, CircleCheck } from "lucide-react-native";
import { createContext, use, useEffect, useRef, useState, type ReactNode } from "react";
import { AccessibilityInfo, Platform, StyleSheet, View } from "react-native";
import Animated, { FadeInDown, FadeOutDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { colors, radius, screenPaddingHorizontal, shadows, sizes, space, tabBarInset } from "@/theme";

import { Text } from "../Text";

export type ToastTone = "success" | "error";

type ToastMessage = { id: number; message: string; tone: ToastTone };

type ToastApi = { show: (message: string, tone?: ToastTone) => void };

const ToastContext = createContext<ToastApi | null>(null);

/** How long a toast stays up. */
export const TOAST_DURATION_MS = 3000;

/** `useToast().show("Treino salvo.")` from any screen under `ToastProvider`. */
export function useToast(): ToastApi {
  const api = use(ToastContext);
  if (api === null) throw new Error("useToast must be used inside <ToastProvider>");
  return api;
}

/**
 * Hosts one toast at a time at the bottom of the screen, just above where the floating tab bar
 * (and, at about the same height, a M Save Bar) ends, inset 20 — the design's placement. A new
 * toast replaces the current one. Toasts are announced to screen readers and never take focus.
 * The host lives under the root `Stack`, so a modal or form sheet covers it: **show a toast
 * after the sheet that triggered it has closed**, not while it is open.
 */
export function ToastProvider({ children }: { children: ReactNode }) {
  const insets = useSafeAreaInsets();
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const nextId = useRef(0);

  useEffect(() => {
    if (toast === null) return;
    const timer = setTimeout(() => setToast(null), TOAST_DURATION_MS);
    return () => clearTimeout(timer);
  }, [toast]);

  const api: ToastApi = {
    show: (message, tone = "success") => {
      nextId.current += 1;
      setToast({ id: nextId.current, message, tone });
      // Android reads it through the toast's live region; announcing too would read it twice.
      if (Platform.OS === "ios") AccessibilityInfo.announceForAccessibility(message);
    },
  };

  return (
    <ToastContext value={api}>
      {children}
      <View
        pointerEvents="box-none"
        style={[styles.host, { bottom: tabBarInset(insets.bottom) + space[3] }]}
      >
        {toast === null ? null : (
          <Animated.View key={toast.id} entering={FadeInDown} exiting={FadeOutDown}>
            <Toast message={toast.message} tone={toast.tone} />
          </Animated.View>
        )}
      </View>
    </ToastContext>
  );
}

/** M Toast / M Toast Error. */
export function Toast({ message, tone }: { message: string; tone: ToastTone }) {
  const success = tone === "success";
  const Icon = success ? CircleCheck : CircleAlert;
  return (
    <View
      style={[styles.toast, { borderColor: success ? colors.borderStrong : colors.danger }]}
      accessibilityLiveRegion="polite"
      accessible
      accessibilityLabel={message}
    >
      <Icon size={20} color={success ? colors.success : colors.danger} />
      <Text variant="body" style={styles.flex}>
        {message}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  host: { position: "absolute", left: screenPaddingHorizontal, right: screenPaddingHorizontal },
  toast: {
    flexDirection: "row",
    alignItems: "center",
    gap: space[3],
    paddingVertical: sizes.toastPaddingVertical,
    paddingHorizontal: space[4],
    borderRadius: radius.lg,
    borderWidth: 1,
    backgroundColor: colors.surfaceActive,
    ...shadows.toast,
  },
  flex: { flex: 1 },
});
