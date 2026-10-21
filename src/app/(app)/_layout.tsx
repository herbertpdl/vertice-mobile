import { Stack } from "expo-router";

import { useAuth, useSessionGate } from "@/lib/auth";
import { ConsentScreen } from "@/screens/session/ConsentScreen";
import { LoadingScreen } from "@/screens/session/LoadingScreen";
import { RoleNoticeScreen } from "@/screens/session/RoleNoticeScreen";
import { SessionErrorScreen } from "@/screens/session/SessionErrorScreen";
import { colors } from "@/theme";

/** Everything behind the session, gated on the account: loading → role → Terms consent → app. */
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
      return <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }} />;
  }
}
