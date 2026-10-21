import { CloudOff, FileText, ShieldCheck } from "lucide-react-native";
import { StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Banner, Button, EmptyState, ListRow, Logo, Text } from "@/components/ui";
import { LEGAL_PAGE_TITLES, openLegalPage } from "@/lib/legal";
import { colors, radius, screenPaddingHorizontal, space } from "@/theme";

export type ConsentScreenProps = {
  /** The Terms version to accept (`GET /api/legal/versions` `.terms`); null when it failed to load. */
  version: string | null;
  onAccept: () => void;
  accepting: boolean;
  /** The accept request failed. */
  acceptError?: string;
  /** Loading the account or the versions failed: show the error state with a retry. */
  loadFailed: boolean;
  onRetry: () => void;
  retrying: boolean;
  onSignOut: () => void;
};

/**
 * M - Termos (Consentimento) / M - Termos (Erro): the blocking gate in front of the app while
 * the trainer's accepted Terms version isn't the current one. It fails closed — if the account or
 * the versions can't be loaded, the error state replaces it, never the app (spec §2, "Consent").
 */
export function ConsentScreen({
  version,
  onAccept,
  accepting,
  acceptError,
  loadFailed,
  onRetry,
  retrying,
  onSignOut,
}: ConsentScreenProps) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.root, { paddingTop: insets.top + space[6], paddingBottom: Math.max(insets.bottom, space[5]) + space[4] }]}>
      <View style={styles.top}>
        <Logo />
        {loadFailed ? (
          <EmptyState
            icon={CloudOff}
            title="Não foi possível carregar seus dados"
            message="Verifique sua conexão e tente novamente."
          />
        ) : (
          <>
            <Text variant="display" accessibilityRole="header">
              Atualizamos nossos termos
            </Text>
            <Text variant="lead" color="textSecondary">
              Para continuar usando o Vertice, leia e aceite a versão mais recente dos Termos de uso e da
              Política de privacidade.
            </Text>
            <View style={styles.docs}>
              <ListRow
                icon={FileText}
                role="link"
                label={LEGAL_PAGE_TITLES.termos}
                onPress={() => void openLegalPage("termos")}
              />
              <ListRow
                icon={ShieldCheck}
                role="link"
                label={LEGAL_PAGE_TITLES.privacidade}
                last
                onPress={() => void openLegalPage("privacidade")}
              />
            </View>
            {version === null ? null : (
              <Text variant="caption" color="textSecondary">
                {`Versão ${version}`}
              </Text>
            )}
            {acceptError === undefined ? null : <Banner message={acceptError} />}
          </>
        )}
      </View>
      <View style={styles.actions}>
        {loadFailed ? (
          <Button label="Tentar novamente" loading={retrying} onPress={onRetry} />
        ) : (
          <Button label="Aceitar e continuar" loading={accepting} disabled={version === null} onPress={onAccept} />
        )}
        <Button label="Sair" variant="ghost" disabled={accepting} onPress={onSignOut} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg,
    paddingHorizontal: screenPaddingHorizontal,
    justifyContent: "space-between",
    gap: space[6],
  },
  top: { gap: space[5] },
  docs: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
  },
  actions: { gap: space[3] },
});
