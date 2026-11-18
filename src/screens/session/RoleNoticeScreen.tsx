import { Smartphone } from "lucide-react-native";
import { StyleSheet, View } from "react-native";

import { Button, EmptyState } from "@/components/ui";
import { colors, screenPaddingHorizontal } from "@/theme";

/**
 * The wrong-role notice's copy. The login shows it too, as one sentence, when the BFF refuses an
 * admin's correct password (403 `ADMIN_LOGIN_ELSEWHERE`, admin-panel R3/E2).
 */
export const ROLE_NOTICE = {
  title: "Este app é para treinadores e alunos",
  message: "Contas de administração não têm acesso pelo aplicativo.",
} as const;

/**
 * The app serves trainers and their clients. An admin who signs in gets this notice and a way
 * out, built from M Empty State. Since the BFF refuses an admin at login, this is the fallback for
 * a session that predates that refusal.
 */
export function RoleNoticeScreen({ onSignOut }: { onSignOut: () => void }) {
  return (
    <View style={styles.root}>
      <EmptyState
        icon={Smartphone}
        title={ROLE_NOTICE.title}
        message={ROLE_NOTICE.message}
      />
      <Button label="Sair" variant="secondary" onPress={onSignOut} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg, justifyContent: "center", paddingHorizontal: screenPaddingHorizontal },
});
