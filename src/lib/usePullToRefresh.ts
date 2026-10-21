import { useState } from "react";

/**
 * The pull-to-refresh spinner state, driven by the pull itself: React Query's `isRefetching`
 * is also true for background refetches (app foreground, stale remounts), which would spin the
 * control when nobody pulled.
 */
export function usePullToRefresh(refetch: () => Promise<unknown>): { refreshing: boolean; onRefresh: () => void } {
  const [refreshing, setRefreshing] = useState(false);
  return {
    refreshing,
    onRefresh: () => {
      setRefreshing(true);
      void refetch().finally(() => setRefreshing(false));
    },
  };
}
