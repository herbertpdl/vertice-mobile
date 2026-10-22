import { Dumbbell } from "lucide-react-native";
import { StyleSheet, View } from "react-native";

import { NavBar, Screen } from "@/components/layout";
import { EmptyState } from "@/components/ui";
import { space } from "@/theme";

/**
 * Where the workout session lands until the session screen ships (client spec PR 18). Kept so
 * "Começar treino" has somewhere to go in the meantime.
 */
export function WorkoutSessionPlaceholderScreen() {
  return (
    <Screen header={<NavBar title="Treino" />}>
      <View style={styles.center}>
        <EmptyState icon={Dumbbell} title="Treino em breve" message="O registro de treinos chega na próxima versão do app." />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({ center: { paddingTop: space[8] } });
