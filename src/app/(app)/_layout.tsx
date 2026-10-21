import { Stack } from "expo-router";

import { useAuth, useSessionGate } from "@/lib/auth";
import { ConsentScreen } from "@/screens/session/ConsentScreen";
import { LoadingScreen } from "@/screens/session/LoadingScreen";
import { RoleNoticeScreen } from "@/screens/session/RoleNoticeScreen";
import { colors } from "@/theme";

/** Everything behind the session, gated on the account: loading → role → Terms consent → app. */
export default function AppLayout() {
  const { signOut } = useAuth();
  const gate = useSessionGate();

  switch (gate.kind) {
    case "loading":
      return <LoadingScreen />;
    case "wrongRole":
      return <RoleNoticeScreen onSignOut={() => void signOut()} />;
    case "error":
    case "consent":
      return (
        <ConsentScreen
          loadFailed={gate.kind === "error"}
          version={gate.kind === "consent" ? gate.version : null}
          onAccept={gate.kind === "consent" ? gate.accept : () => {}}
          accepting={gate.kind === "consent" && gate.accepting}
          acceptError={gate.kind === "consent" ? gate.acceptError : undefined}
          onRetry={gate.kind === "error" ? gate.retry : () => {}}
          retrying={gate.kind === "error" && gate.retrying}
          onSignOut={() => void signOut()}
        />
      );
    case "ready":
      return <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }} />;
  }
}
