import { StyleSheet, View } from "react-native";

import { Logo, Spinner, Text } from "@/components/ui";
import { colors, sizes } from "@/theme";

/**
 * M - Splash (Carregando): shown after the native splash while the signed-in user's account
 * (`GET /api/auth/me`) loads, so the app never flashes a screen the user may not be allowed on.
 */
export function LoadingScreen() {
  return (
    <View style={styles.root} accessible accessibilityLabel="Carregando seus dados" accessibilityRole="progressbar">
      <Logo layout="stacked" />
      <View style={styles.loading}>
        <Spinner />
        <Text variant="body" color="textSecondary">
          Carregando seus dados…
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg, alignItems: "center", justifyContent: "center", gap: sizes.authGroupGap },
  loading: { alignItems: "center", gap: sizes.loadingGroupGap },
});
