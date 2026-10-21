import { CloudOff } from "lucide-react-native";
import { StyleSheet, View } from "react-native";

import { Screen } from "@/components/layout/Screen";
import { Button, EmptyState, Logo } from "@/components/ui";
import { space } from "@/theme";

/**
 * M - Termos (Erro): the account or the legal versions couldn't be loaded, so the gate stays
 * closed (never the app) with a retry and a way out.
 */
export function SessionErrorScreen({ onRetry, retrying, onSignOut }: { onRetry: () => void; retrying: boolean; onSignOut: () => void }) {
  return (
    <Screen
      contentStyle={styles.content}
      footer={
        <View style={styles.actions}>
          <Button label="Tentar novamente" loading={retrying} onPress={onRetry} />
          <Button label="Sair" variant="ghost" onPress={onSignOut} />
        </View>
      }
    >
      <Logo />
      <EmptyState icon={CloudOff} title="Não foi possível carregar seus dados" message="Verifique sua conexão e tente novamente." />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingTop: space[6], gap: space[5] },
  actions: { gap: space[3] },
});
