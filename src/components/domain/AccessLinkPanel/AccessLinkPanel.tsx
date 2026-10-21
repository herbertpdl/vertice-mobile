import * as Clipboard from "expo-clipboard";
import { Copy, Hourglass, Link } from "lucide-react-native";
import { Share, StyleSheet, View } from "react-native";

import { Button, IconButton, Text, useToast } from "@/components/ui";
import type { PasswordSetup } from "@/lib/api/types";
import { accessLinkExpiry, studentAccessLink } from "@/lib/students";
import { colors, controls, radius, sizes, space } from "@/theme";

export type AccessLinkPanelProps = {
  studentName: string;
  setup: PasswordSetup;
};

/**
 * The first-access link a trainer sends a new student: M Link Box (link + copy), the expiry, and
 * "Compartilhar link" (the system share sheet). The token is single-use and shown once — it lives
 * in the caller's state, never in the query cache.
 */
export function AccessLinkPanel({ studentName, setup }: AccessLinkPanelProps) {
  const toast = useToast();
  const link = studentAccessLink(setup.token);
  // What the box shows: the link without its scheme, like the design ("vertice.app/…").
  const shown = link.replace(/^https?:\/\//, "");

  return (
    <View style={styles.root}>
      <View style={styles.box}>
        <Link size={18} color={colors.primary} />
        <Text variant="bodyStrong" numberOfLines={1} ellipsizeMode="middle" style={styles.flex} selectable>
          {shown}
        </Text>
        <IconButton
          icon={Copy}
          variant="plain"
          color="textSecondary"
          iconSize={18}
          accessibilityLabel="Copiar link"
          onPress={() => {
            void Clipboard.setStringAsync(link).then(() => toast.show("Link copiado."));
          }}
        />
      </View>
      <View style={styles.expiry}>
        <Hourglass size={14} color={colors.textSecondary} />
        <Text variant="caption" color="textSecondary">
          {accessLinkExpiry(setup)}
        </Text>
      </View>
      <Button
        label="Compartilhar link"
        onPress={() =>
          void Share.share({
            message: `${studentName}, defina sua senha no Vertice: ${link}`,
            url: link,
          })
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: space[3] },
  box: {
    flexDirection: "row",
    alignItems: "center",
    gap: controls.fieldContentGap,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: space[1],
    paddingLeft: sizes.linkBoxPaddingLeft,
  },
  expiry: { flexDirection: "row", alignItems: "center", gap: sizes.inlineLinkGap },
  flex: { flex: 1 },
});
