import { setAudioModeAsync, useAudioPlayer } from "expo-audio";
import * as Haptics from "expo-haptics";
import * as Notifications from "expo-notifications";
import { useEffect, useRef } from "react";

import type { Timer } from "./engine";

/**
 * The rest alert (PRD R49–R51): a phone notification scheduled for the rest's end, for when the
 * app is in the background or the phone is locked; vibration and a short chime when the rest ends
 * with the app open. While the app is open the notification itself stays silent and hidden (the
 * in-app alert is the one alert). No permission, no notification: the in-app alert still plays.
 */
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: false,
    shouldShowList: false,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

const REST_SOUND = require("@/assets/sounds/rest-done.wav");

let asked = false;

/** Asks once per app run, on the first rest; a denial is silent (R51). */
export async function ensureNotificationPermission(): Promise<boolean> {
  const current = await Notifications.getPermissionsAsync();
  if (current.status === "granted") return true;
  if (asked || !current.canAskAgain) return false;
  asked = true;
  return (await Notifications.requestPermissionsAsync()).status === "granted";
}

/** "Hora da série 4 de Puxada frontal" — what the notification says. */
export type RestNotice = { title: string; body: string };

/**
 * Keeps one notification scheduled for the running rest: a new rest replaces it, no rest (ticked
 * another set, changed exercise, left the screen) cancels it.
 */
export function useRestNotification(rest: Timer | null, notice: RestNotice | undefined, now: () => number) {
  const scheduled = useRef<string | null>(null);
  const key = rest === null ? null : `${rest.setId}:${rest.endsAt}`;
  useEffect(() => {
    let cancelled = false;
    const cancel = () => {
      const id = scheduled.current;
      scheduled.current = null;
      if (id !== null) void Notifications.cancelScheduledNotificationAsync(id);
    };
    if (rest !== null && notice !== undefined && rest.endsAt > now()) {
      void ensureNotificationPermission().then(async (granted) => {
        // Measured once the permission prompt is gone, so the time it was up isn't added.
        const seconds = Math.ceil((rest.endsAt - now()) / 1000);
        if (!granted || cancelled || seconds <= 0) return;
        const id = await Notifications.scheduleNotificationAsync({
            content: { title: notice.title, body: notice.body, sound: true },
          trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds },
        });
        if (cancelled) void Notifications.cancelScheduledNotificationAsync(id);
        else scheduled.current = id;
      });
    }
    return () => {
      cancelled = true;
      cancel();
    };
    // The schedule follows the rest itself (set and end time), not each render's objects.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
}

/** Clears a rest notification already delivered while the app was away (it's stale once back). */
export function dismissRestNotifications() {
  void Notifications.dismissAllNotificationsAsync();
}

/**
 * The in-app alert: vibration plus the chime, respecting the silent switch and mixing with the
 * client's music (R49).
 */
export function useRestAlert(): () => void {
  const player = useAudioPlayer(REST_SOUND);
  useEffect(() => {
    void setAudioModeAsync({ playsInSilentMode: false, interruptionMode: "mixWithOthers" });
  }, []);
  return () => {
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    void player.seekTo(0).then(() => player.play());
  };
}
