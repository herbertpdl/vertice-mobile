import { onlineManager } from "@tanstack/react-query";
import { useSyncExternalStore } from "react";

/**
 * Whether the device is offline, as React Query sees it (fed by NetInfo in `query-client.ts`):
 * screens show M Offline Banner while it's true, and queries pause until it isn't.
 */
export function useIsOffline(): boolean {
  return useSyncExternalStore(
    (onChange) => onlineManager.subscribe(onChange),
    () => !onlineManager.isOnline(),
  );
}
