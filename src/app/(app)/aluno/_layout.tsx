import { Stack } from "expo-router";

import { useWorkoutOutbox } from "@/lib/workoutSession/useWorkoutOutbox";
import { colors } from "@/theme";

/** The client app (`/aluno`): its tabs and the screens pushed over them, with the workout outbox. */
export default function ClientLayout() {
  useWorkoutOutbox();
  return <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }} />;
}
