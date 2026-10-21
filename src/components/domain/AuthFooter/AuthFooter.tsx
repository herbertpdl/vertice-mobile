import { StyleSheet, View } from "react-native";

import { Text, TextLink } from "@/components/ui";
import { sizes } from "@/theme";

/** "Não tem uma conta? Cadastre-se" / "Já tem uma conta? Entrar": the auth screens' last line. */
export function AuthFooter({ question, action, onPress }: { question: string; action: string; onPress: () => void }) {
  return (
    <View style={styles.row}>
      <Text variant="bodyMd" color="textSecondary">
        {question}
      </Text>
      <TextLink label={action} variant="bodyMdStrong" onPress={onPress} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", justifyContent: "center", alignItems: "center", gap: sizes.inlineLinkGap },
});
