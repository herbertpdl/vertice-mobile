import { Tabs } from "expo-router/tabs";
import { Dumbbell, House, User, Users } from "lucide-react-native";

import { TabBar } from "@/components/layout/TabBar";
import { colors } from "@/theme";

/** The four tabs of M Tab Bar. The bar floats over the content (see `Screen inTabs`). */
export default function TabsLayout() {
  return (
    <Tabs
      tabBar={(props) => <TabBar {...props} />}
      screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: colors.bg } }}
    >
      <Tabs.Screen name="index" options={{ title: "Início", tabBarIcon: ({ color, size }) => <House color={color} size={size} /> }} />
      <Tabs.Screen name="alunos" options={{ title: "Alunos", tabBarIcon: ({ color, size }) => <Users color={color} size={size} /> }} />
      <Tabs.Screen
        name="exercicios"
        options={{ title: "Exercícios", tabBarIcon: ({ color, size }) => <Dumbbell color={color} size={size} /> }}
      />
      <Tabs.Screen name="perfil" options={{ title: "Perfil", tabBarIcon: ({ color, size }) => <User color={color} size={size} /> }} />
    </Tabs>
  );
}
