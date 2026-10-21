import { QueryClientProvider } from "@tanstack/react-query";
import { Stack, type ErrorBoundaryProps } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { StyleSheet, View } from "react-native";

import { ErrorState } from "@/components/ui/EmptyState";
import { ToastProvider } from "@/components/ui/Toast";
import { AuthProvider, useAuth } from "@/lib/auth";
import { initMonitoring, reportError } from "@/lib/monitoring";
import { queryClient } from "@/lib/query-client";
import { colors } from "@/theme";
import { useAppFonts } from "@/theme/fonts";

// Keep the native splash up until the fonts are loaded and the stored session is restored, so no
// frame renders in a fallback face or flashes the login screen at a signed-in user. Called at
// module scope, as expo-splash-screen asks.
void SplashScreen.preventAutoHideAsync();
initMonitoring();

export default function RootLayout() {
  const [fontsLoaded, fontError] = useAppFonts();
  const fontsReady = fontsLoaded || fontError !== null;

  useEffect(() => {
    if (fontError !== null) console.warn("Fonts failed to load; using the system face.", fontError);
  }, [fontError]);

  // A font that failed to load falls back to the system face rather than blocking the app.
  if (!fontsReady) return null;

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ToastProvider>
          {/* The app is dark-only (`userInterfaceStyle: "dark"` in app.json). */}
          <StatusBar style="light" />
          <RootStack />
        </ToastProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

function RootStack() {
  const { status } = useAuth();
  const ready = status !== "restoring";

  useEffect(() => {
    if (ready) SplashScreen.hide();
  }, [ready]);

  if (!ready) return null;

  // `(app)` is declared first: when a guard blocks a route, Expo Router falls back to the first
  // available screen — the app for a session, `login` without one.
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.bg },
      }}
    >
      <Stack.Protected guard={status === "signedIn"}>
        <Stack.Screen name="(app)" />
      </Stack.Protected>
      <Stack.Protected guard={status === "signedOut"}>
        <Stack.Screen name="login" />
        <Stack.Screen name="cadastro" />
      </Stack.Protected>
      <Stack.Screen name="(dev)/kit" />
    </Stack>
  );
}

/**
 * Expo Router renders this instead of a route that threw while rendering (audit P2-05): the
 * design's "Algo deu errado" state with a retry that re-renders the route, rather than a red box
 * in development or a blank screen in a release build.
 */
export function ErrorBoundary({ error, retry }: ErrorBoundaryProps) {
  useEffect(() => {
    reportError(error);
  }, [error]);
  useEffect(() => {
    SplashScreen.hide();
  }, []);
  return (
    <View style={styles.error}>
      <ErrorState onRetry={() => void retry()} />
    </View>
  );
}

const styles = StyleSheet.create({
  error: { flex: 1, justifyContent: "center", backgroundColor: colors.bg },
});
