import { CircleAlert, TriangleAlert, type LucideIcon } from "lucide-react-native";
import { Modal, StyleSheet, View } from "react-native";
import Animated, { ZoomIn } from "react-native-reanimated";

import { useAnnounceOnIos } from "@/lib/a11y";
import { useSingleFlight } from "@/lib/useSingleFlight";
import { colors, overlay, radius, shadows, sizes, SOFT_TINT_ALPHA, space, TINT_ALPHA, withAlpha } from "@/theme";

import { Button } from "../Button";
import { Text } from "../Text";

export type ConfirmDialogProps = {
  visible: boolean;
  title: string;
  message: string;
  /** The destructive button's label ("Excluir", "Encerrar vínculo"). */
  confirmLabel: string;
  /** Runs once per confirmation, however fast the button is tapped. */
  onConfirm: () => void | Promise<unknown>;
  onCancel: () => void;
  /** The request is in flight: the confirm button spins and nothing can dismiss the dialog. */
  loading?: boolean;
  /** The failure, shown inside the dialog (the dialog stays open so the user can retry). */
  error?: string;
  /** The glyph in the icon disc (M - Excluir Treino: trash). */
  icon?: LucideIcon;
  /**
   * The disc's color: `warning` for a non-destructive loss (M - Descartar alterações), `info` for a
   * neutral choice (A - Refazer treino concluído).
   */
  tone?: "danger" | "warning" | "info";
  /** The confirm button: `danger` (default, a deletion) or `primary` (A - Finalizar com séries pendentes). */
  confirmVariant?: "danger" | "primary";
  /** The dismiss button's label ("Continuar editando"). */
  cancelLabel?: string;
};

/**
 * M Confirm Dialog: the gate in front of every destructive action, centred over the backdrop —
 * a danger icon, 20/700 title, message, an inline error row, and Excluir / Cancelar stacked.
 * Like the web's `ConfirmDialog`, one tap sends one request (`useSingleFlight`).
 */
export function ConfirmDialog({
  visible,
  title,
  message,
  confirmLabel,
  onConfirm,
  onCancel,
  loading = false,
  error,
  icon: Icon = TriangleAlert,
  tone = "danger",
  confirmVariant = "danger",
  cancelLabel = "Cancelar",
}: ConfirmDialogProps) {
  useAnnounceOnIos(error);
  const confirm = useSingleFlight(onConfirm);

  const cancel = () => {
    if (!loading) onCancel();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      navigationBarTranslucent
      onRequestClose={cancel}
    >
      <View style={styles.backdrop}>
        <Animated.View
          entering={ZoomIn.duration(180)}
          style={styles.card}
          accessibilityViewIsModal
          accessibilityRole="alert"
        >
          <View style={[styles.icon, { backgroundColor: withAlpha(colors[tone], TINT_ALPHA) }]}>
            <Icon size={24} color={colors[tone]} />
          </View>
          <View style={styles.text}>
            <Text variant="titleSm" accessibilityRole="header">
              {title}
            </Text>
            <Text variant="bodyRelaxed" color="textSecondary">
              {message}
            </Text>
          </View>
          {error === undefined ? null : (
            <View style={styles.error} accessibilityLiveRegion="polite">
              <CircleAlert size={16} color={colors.danger} />
              <Text variant="caption" color="danger" style={styles.flex}>
                {error}
              </Text>
            </View>
          )}
          <View style={styles.buttons}>
            <Button variant={confirmVariant} label={confirmLabel} loading={loading} onPress={confirm} />
            <Button variant="secondary" label={cancelLabel} disabled={loading} onPress={cancel} />
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: overlay.backdrop,
    alignItems: "center",
    justifyContent: "center",
    padding: space[5],
  },
  card: {
    width: "100%",
    maxWidth: sizes.dialogWidth,
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: space[6],
    gap: space[4],
    ...shadows.dialog,
  },
  icon: {
    width: sizes.dialogIcon,
    height: sizes.dialogIcon,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
  },
  text: { gap: space[2] },
  error: {
    flexDirection: "row",
    gap: space[2],
    paddingVertical: sizes.dialogErrorPaddingVertical,
    paddingHorizontal: space[3],
    borderRadius: radius.md,
    backgroundColor: withAlpha(colors.danger, SOFT_TINT_ALPHA),
  },
  flex: { flex: 1 },
  buttons: { gap: sizes.dialogButtonGap },
});
