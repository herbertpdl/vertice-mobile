import { Stack } from "expo-router";
import { useEffect } from "react";

import { endRestCountdown } from "@/lib/workoutSession/restCountdown";
import { useWorkoutOutbox } from "@/lib/workoutSession/useWorkoutOutbox";
import { colors } from "@/theme";

/** The client app (`/aluno`): its tabs and the screens pushed over them, with the workout outbox. */
export default function ClientLayout() {
  useWorkoutOutbox();
  // Opening the app: a rest left on the lock screen by a closed app is over or resumes with its session.
  useEffect(endRestCountdown, []);
  return <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }} />;
}
