import { StyleSheet, View } from "react-native";

import { Screen } from "@/components/layout/Screen";
import { Button, Text } from "@/components/ui";
import { useAuth, useMe } from "@/lib/auth";
import { space } from "@/theme";

/** Placeholder home until the tabs land (spec PR 7). */
export function HomeScreen() {
  const { signOut } = useAuth();
  const { data: me } = useMe();
  return (
    <Screen contentStyle={styles.content}>
      <View style={styles.head}>
        <Text variant="title">{`Olá, ${me?.name.split(" ")[0] ?? ""}`}</Text>
        <Text variant="body" color="textSecondary">
          As telas do app chegam nos próximos PRs.
        </Text>
      </View>
      <Button label="Sair" variant="secondary" onPress={() => void signOut()} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingTop: space[6], gap: space[6] },
  head: { gap: space[2] },
});
