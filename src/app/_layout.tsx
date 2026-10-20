import { QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";

import { queryClient } from "@/lib/query-client";
import { colors } from "@/theme";
import { useAppFonts } from "@/theme/fonts";

// Keep the native splash up until the fonts are ready, so no frame renders in a fallback face.
// Called at module scope, as expo-splash-screen asks.
void SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded, fontError] = useAppFonts();
  const ready = fontsLoaded || fontError !== null;

  useEffect(() => {
    if (ready) SplashScreen.hide();
  }, [ready]);

  // A font that failed to load falls back to the system face rather than blocking the app.
  if (!ready) return null;

  return (
    <QueryClientProvider client={queryClient}>
      {/* The app is dark-only (`userInterfaceStyle: "dark"` in app.json). */}
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.bg },
        }}
      />
    </QueryClientProvider>
  );
}
