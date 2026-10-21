import { useEffect } from "react";
import { AccessibilityInfo, Platform } from "react-native";

/**
 * Announces `message` to VoiceOver when it appears or changes. Android gets the same through
 * `accessibilityLiveRegion` on the element showing it, which iOS ignores — so a field error or a
 * banner calls both.
 */
export function useAnnounceOnIos(message: string | undefined): void {
  useEffect(() => {
    if (message !== undefined && message !== "" && Platform.OS === "ios") {
      AccessibilityInfo.announceForAccessibility(message);
    }
  }, [message]);
}
