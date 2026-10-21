import { Smartphone } from "lucide-react-native";
import { StyleSheet, View } from "react-native";

import { Button, EmptyState } from "@/components/ui";
import { colors, screenPaddingHorizontal } from "@/theme";

/**
 * v1 of the app is for trainers (spec §1). A student (or an admin) who signs in gets this notice
 * and a way out, built from M Empty State — the student app needs its own PRD and designs.
 */
export function RoleNoticeScreen({ onSignOut }: { onSignOut: () => void }) {
  return (
    <View style={styles.root}>
      <EmptyState
        icon={Smartphone}
        title="O app do aluno está a caminho"
        message="Este aplicativo é para treinadores. Enquanto isso, fale com seu treinador para acompanhar seus treinos."
      />
      <Button label="Sair" variant="secondary" onPress={onSignOut} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg, justifyContent: "center", paddingHorizontal: screenPaddingHorizontal },
});
