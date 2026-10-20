import { StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Text } from "@/components/ui/Text";
import { colors, screenPaddingHorizontal, space } from "@/theme";

export default function Index() {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text variant="display">Vertice</Text>
        <Text variant="bodyMd" color="textSecondary" align="center">
          Mobile app scaffold — no screens implemented yet.
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: space[2],
    paddingHorizontal: screenPaddingHorizontal,
  },
});
