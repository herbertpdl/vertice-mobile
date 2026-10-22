import { Stack } from "expo-router";

import { colors } from "@/theme";

/** The client app (`/aluno`): its tabs and the screens pushed over them. */
export default function ClientLayout() {
  return <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }} />;
}
