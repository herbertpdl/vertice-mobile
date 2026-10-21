import { FileText, ShieldCheck } from "lucide-react-native";
import { StyleSheet, View } from "react-native";

import { Screen } from "@/components/layout/Screen";
import { Banner, Button, ListRow, Logo, Text } from "@/components/ui";
import { LEGAL_PAGE_TITLES, openLegalPage } from "@/lib/legal";
import { colors, radius, space } from "@/theme";

export type ConsentScreenProps = {
  /** The Terms version to accept (`GET /api/legal/versions` `.terms`). */
  version: string;
  /** False for an account that never accepted any version (the web's "Antes de continuar"). */
  updated: boolean;
  onAccept: () => void;
  accepting: boolean;
  acceptError?: string;
  onSignOut: () => void;
};

/**
 * M - Termos (Consentimento): the blocking gate in front of the app while the trainer's accepted
 * Terms version isn't the current one. Scrolls (large text, small phones), with the actions pinned.
 * pen.dev only draws the "updated" variant; the first-acceptance copy is the web's.
 */
export function ConsentScreen({ version, updated, onAccept, accepting, acceptError, onSignOut }: ConsentScreenProps) {
  return (
    <Screen
      contentStyle={styles.content}
      footer={
        <View style={styles.actions}>
          <Button label="Aceitar e continuar" loading={accepting} onPress={onAccept} />
          <Button label="Sair" variant="ghost" disabled={accepting} onPress={onSignOut} />
        </View>
      }
    >
      <Logo />
      <Text variant="display" accessibilityRole="header">
        {updated ? "Atualizamos nossos termos" : "Antes de continuar"}
      </Text>
      <Text variant="lead" color="textSecondary">
        {updated
          ? "Para continuar usando o Vertice, leia e aceite a versão mais recente dos Termos de uso e da Política de privacidade."
          : "Para usar o Vertice, é preciso aceitar os Termos de uso e a Política de privacidade."}
      </Text>
      <View style={styles.docs}>
        <ListRow icon={FileText} role="link" label={LEGAL_PAGE_TITLES.termos} onPress={() => void openLegalPage("termos")} />
        <ListRow
          icon={ShieldCheck}
          role="link"
          label={LEGAL_PAGE_TITLES.privacidade}
          last
          onPress={() => void openLegalPage("privacidade")}
        />
      </View>
      <Text variant="caption" color="textSecondary">
        {`Versão ${version} · Ao aceitar, você declara que leu e concorda com os dois textos.`}
      </Text>
      {acceptError === undefined ? null : <Banner message={acceptError} />}
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingTop: space[6], gap: space[5] },
  docs: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
  },
  actions: { gap: space[3] },
});
