import { Smartphone } from "lucide-react-native";
import { StyleSheet, View } from "react-native";

import { Button, EmptyState } from "@/components/ui";
import { colors, screenPaddingHorizontal } from "@/theme";

/**
 * The app serves trainers and their clients. An admin who signs in gets this notice and a way
 * out, built from M Empty State.
 */
export function RoleNoticeScreen({ onSignOut }: { onSignOut: () => void }) {
  return (
    <View style={styles.root}>
      <EmptyState
        icon={Smartphone}
        title="Este app é para treinadores e alunos"
        message="Contas de administração não têm acesso pelo aplicativo."
      />
      <Button label="Sair" variant="secondary" onPress={onSignOut} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg, justifyContent: "center", paddingHorizontal: screenPaddingHorizontal },
});
