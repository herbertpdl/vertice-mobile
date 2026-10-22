import { Tabs } from "expo-router/tabs";
import { ClipboardList, House, User } from "lucide-react-native";

import { TabBar } from "@/components/layout/TabBar";
import { colors } from "@/theme";

/** M Tab Bar Aluno: Início, Planos, Perfil (PRD R9). */
export default function ClientTabsLayout() {
  return (
    <Tabs
      tabBar={(props) => <TabBar {...props} />}
      screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: colors.bg } }}
    >
      <Tabs.Screen name="index" options={{ title: "Início", tabBarIcon: ({ color, size }) => <House color={color} size={size} /> }} />
      <Tabs.Screen
        name="planos"
        options={{ title: "Planos", tabBarIcon: ({ color, size }) => <ClipboardList color={color} size={size} /> }}
      />
      <Tabs.Screen name="perfil" options={{ title: "Perfil", tabBarIcon: ({ color, size }) => <User color={color} size={size} /> }} />
    </Tabs>
  );
}
