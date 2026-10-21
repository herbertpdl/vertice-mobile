import * as Clipboard from "expo-clipboard";
import { Check, Copy, Hourglass, Link } from "lucide-react-native";
import { useEffect, useState } from "react";
import { Share, StyleSheet, View } from "react-native";

import { Button, IconButton, Text } from "@/components/ui";
import type { PasswordSetup } from "@/lib/api/types";
import { accessLinkExpiry, studentAccessLink } from "@/lib/students";
import { colors, controls, radius, sizes, space } from "@/theme";

export type AccessLinkPanelProps = {
  studentName: string;
  setup: PasswordSetup;
};

/** How long the copy button shows its "copied" check. */
const COPIED_MS = 2000;

/**
 * The first-access link a trainer sends a new student: M Link Box (link + copy), the expiry, and
 * "Compartilhar link" (the system share sheet). The token is single-use and shown once — it lives
 * in the caller's state, never in the query cache. Copy feedback is shown in place (a check, read
 * out), not as a toast: this panel lives in a sheet, which covers the toast host.
 */
export function AccessLinkPanel({ studentName, setup }: AccessLinkPanelProps) {
  const link = studentAccessLink(setup.token);
  // What the box shows: the link without its scheme, like the design ("vertice.app/…").
  const shown = link.replace(/^https?:\/\//, "");
  const [copy, setCopy] = useState<"idle" | "copied" | "failed">("idle");

  useEffect(() => {
    if (copy === "idle") return;
    const timer = setTimeout(() => setCopy("idle"), COPIED_MS);
    return () => clearTimeout(timer);
  }, [copy]);

  const copyLink = async () => {
    try {
      await Clipboard.setStringAsync(link);
      setCopy("copied");
    } catch {
      setCopy("failed");
    }
  };

  return (
    <View style={styles.root}>
      <View style={styles.box}>
        <Link size={18} color={colors.primary} />
        <Text variant="bodyStrong" numberOfLines={1} ellipsizeMode="middle" style={styles.flex} selectable>
          {shown}
        </Text>
        <IconButton
          icon={copy === "copied" ? Check : Copy}
          variant="plain"
          color={copy === "copied" ? "success" : "textSecondary"}
          iconSize={18}
          accessibilityLabel={copy === "copied" ? "Link copiado" : "Copiar link"}
          onPress={() => void copyLink()}
        />
      </View>
      <View style={styles.expiry} accessibilityLiveRegion="polite">
        <Hourglass size={14} color={colors.textSecondary} />
        <Text variant="caption" color={copy === "failed" ? "danger" : copy === "copied" ? "success" : "textSecondary"}>
          {copy === "copied" ? "Link copiado." : copy === "failed" ? "Não foi possível copiar o link." : accessLinkExpiry(setup)}
        </Text>
      </View>
      <Button
        label="Compartilhar link"
        onPress={() => {
          // The link goes in the message only: passing `url` too makes iOS share it twice.
          Share.share({ message: `${studentName}, defina sua senha no Vertice: ${link}` }).catch(() => {});
        }}
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
