import { StyleSheet, View } from "react-native";

import { Button } from "@/components/ui/Button";
import { Text } from "@/components/ui/Text";
import { colors, radius, sizes, space } from "@/theme";

export type SaveBarProps = {
  /** The status line ("Alterações não salvas", "Salvando alterações…"); none hides the row. */
  status?: { message: string; tone: "warning" | "danger" };
  secondary: { label: string; onPress: () => void; disabled?: boolean };
  primary: { label: string; onPress: () => void; disabled?: boolean; loading?: boolean };
};

/**
 * M Save Bar: an 8 pt status dot with a 13 secondary line, then two equal buttons (Descartar +
 * Salvar treino). Render it as a `Screen` footer with `footerStyle={saveBarFrame}` — the `surface`
 * band with its top border.
 */
export function SaveBar({ status, secondary, primary }: SaveBarProps) {
  return (
    <View style={styles.root}>
      {status === undefined ? null : (
        <View style={styles.status} accessibilityLiveRegion="polite">
          <View style={[styles.dot, { backgroundColor: status.tone === "danger" ? colors.danger : colors.warning }]} />
          <Text variant="caption" color={status.tone === "danger" ? "danger" : "textSecondary"} style={styles.flex}>
            {status.message}
          </Text>
        </View>
      )}
      <View style={styles.buttons}>
        <Button label={secondary.label} variant="secondary" style={styles.flex} disabled={secondary.disabled} onPress={secondary.onPress} />
        <Button
          label={primary.label}
          style={styles.flex}
          disabled={primary.disabled}
          loading={primary.loading}
          onPress={primary.onPress}
        />
      </View>
    </View>
  );
}

/** The `Screen` footer frame M Save Bar sits in. */
export const saveBarFrame = {
  backgroundColor: colors.surface,
  borderTopWidth: 1,
  borderTopColor: colors.border,
  paddingTop: sizes.saveBarPaddingTop,
} as const;

const styles = StyleSheet.create({
  root: { gap: space[3] },
  status: { flexDirection: "row", alignItems: "center", gap: space[2] },
  dot: { width: sizes.statusDot, height: sizes.statusDot, borderRadius: radius.full },
  buttons: { flexDirection: "row", gap: space[3] },
  flex: { flex: 1 },
});
