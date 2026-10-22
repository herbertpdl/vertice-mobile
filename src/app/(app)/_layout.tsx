import { Stack } from "expo-router";

import { useAuth, useSessionGate } from "@/lib/auth";
import { ConsentScreen } from "@/screens/session/ConsentScreen";
import { LoadingScreen } from "@/screens/session/LoadingScreen";
import { RoleNoticeScreen } from "@/screens/session/RoleNoticeScreen";
import { SessionErrorScreen } from "@/screens/session/SessionErrorScreen";
import { colors } from "@/theme";

/**
 * Everything behind the session, gated on the account: loading → role → Terms consent → app. The
 * trainer app (`(tabs)` at `/`) and the client app (`aluno`, at `/aluno`) are role-guarded groups:
 * a blocked group falls back to the first available screen, so each role lands on its own home.
 * Every trainer route is listed under the trainer guard, so a client's stale or deep link to one
 * falls back to the client app; `perfil/senha` and `perfil/excluir-conta` stay open to both.
 */
export default function AppLayout() {
  const { signOut } = useAuth();
  const gate = useSessionGate();
  const leave = () => void signOut();

  switch (gate.kind) {
    case "loading":
      return <LoadingScreen />;
    case "error":
      return <SessionErrorScreen onRetry={gate.retry} retrying={gate.retrying} onSignOut={leave} />;
    case "wrongRole":
      return <RoleNoticeScreen onSignOut={leave} />;
    case "consent":
      return (
        <ConsentScreen
          version={gate.version}
          updated={gate.updated}
          onAccept={gate.accept}
          accepting={gate.accepting}
          acceptError={gate.acceptError}
          onSignOut={leave}
        />
      );
    case "ready":
      return (
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }}>
          <Stack.Protected guard={gate.me.role === "TRAINER"}>
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="alunos/[id]" />
            <Stack.Screen name="exercicios/novo" />
            <Stack.Screen name="exercicios/[id]/index" />
            <Stack.Screen name="exercicios/[id]/editar" />
            <Stack.Screen name="planos/novo" />
            <Stack.Screen name="planos/[id]/index" />
            <Stack.Screen name="planos/[id]/editar" />
            <Stack.Screen name="planos/[id]/treinos/novo" />
            <Stack.Screen name="treinos/[id]" />
            <Stack.Screen name="feedbacks" />
          </Stack.Protected>
          <Stack.Protected guard={gate.me.role === "CLIENT"}>
            <Stack.Screen name="aluno" />
          </Stack.Protected>
        </Stack>
      );
  }
}
