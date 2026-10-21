import NetInfo from "@react-native-community/netinfo";
import { focusManager, onlineManager, QueryClient } from "@tanstack/react-query";
import { AppState, Platform, type AppStateStatus } from "react-native";

import { ApiError } from "@/lib/api/client";

/**
 * A 4xx is the server's considered answer (validation, ownership, not found): retrying it can't
 * change it, and a 429 must not be hammered. Network failures, timeouts and 5xx get one retry,
 * like the web's `retry: 1`.
 */
export function shouldRetry(failureCount: number, error: unknown): boolean {
  if (error instanceof ApiError && error.status >= 400 && error.status < 500) return false;
  return failureCount < 1;
}

export const queryClient = new QueryClient({
  defaultOptions: {
    // Same freshness as the web (`src/app/providers.tsx` there): 30 s.
    queries: { staleTime: 30_000, retry: shouldRetry },
    // Mutations fail fast offline (`apiFetch` → NETWORK_ERROR) instead of pausing until the
    // connection returns: a paused mutation stays "pending", which would lock the sheet or dialog
    // that started it.
    mutations: { retry: false, networkMode: "always" },
  },
});

// React Query's browser defaults don't apply on a phone: refetch stale queries when the app comes
// back to the foreground (AppState), and pause/resume with the connection (NetInfo).
if (Platform.OS !== "web") {
  focusManager.setEventListener((setFocused) => {
    const subscription = AppState.addEventListener("change", (state: AppStateStatus) =>
      setFocused(state === "active"),
    );
    return () => subscription.remove();
  });
  onlineManager.setEventListener((setOnline) =>
    NetInfo.addEventListener((state) => setOnline(state.isConnected !== false)),
  );
}
