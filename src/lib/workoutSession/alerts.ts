import { setAudioModeAsync, useAudioPlayer } from "expo-audio";
import * as Notifications from "expo-notifications";
import { useEffect, useRef } from "react";
import { Platform, Vibration } from "react-native";

import type { Timer } from "./engine";

/**
 * The rest alert (PRD R49–R51): a phone notification scheduled for the rest's end, for when the
 * app is in the background or the phone is locked; three long vibrations and a chime when the rest
 * ends with the app open (in a gym, a light tap goes unnoticed). While the app is open the notification itself stays silent and hidden (the
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

const REST_SOUND = require("@/assets/sounds/rest_done.wav");
/** The same chime as a notification sound: the file `sounds` bundles in app.json. */
const REST_SOUND_FILE = "rest_done.wav";
const REST_CHANNEL = "rest-timer";
const REST_NOTIFICATION = "rest";

/**
 * Three long pulses. Android reads the array as wait/vibrate times; on iOS each entry after the
 * leading 0 is the pause before the next fixed-length vibration of the system's motor.
 */
const ALERT_VIBRATION = Platform.OS === "android" ? [0, 600, 250, 600, 250, 600] : [0, 800, 800];

let asked = false;

/** Asks once per app run, on the first rest; a denial is silent (R51). */
export async function ensureNotificationPermission(): Promise<boolean> {
  const current = await Notifications.getPermissionsAsync();
  if (current.status === "granted") return true;
  if (asked || !current.canAskAgain) return false;
  asked = true;
  return (await Notifications.requestPermissionsAsync()).status === "granted";
}

/** Android takes the sound and vibration from the channel, which must exist before scheduling. */
async function ensureRestChannel() {
  if (Platform.OS !== "android") return;
  await Notifications.setNotificationChannelAsync(REST_CHANNEL, {
    name: "Descanso",
    importance: Notifications.AndroidImportance.HIGH,
    sound: REST_SOUND_FILE,
    vibrationPattern: ALERT_VIBRATION,
    lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
  });
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
        await ensureRestChannel();
        const id = await Notifications.scheduleNotificationAsync({
          content: { title: notice.title, body: notice.body, sound: REST_SOUND_FILE, data: { kind: REST_NOTIFICATION } },
          trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds, channelId: REST_CHANNEL },
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
  // Only those: dismissing all would take the running rest's countdown off Android's lock screen.
  void Notifications.getPresentedNotificationsAsync().then((presented) => {
    for (const { request } of presented) {
      if (request.content.data?.kind === REST_NOTIFICATION) void Notifications.dismissNotificationAsync(request.identifier);
    }
  });
}

/**
 * The in-app alert: vibration, plus the chime unless the silent switch is on, mixing with the
 * client's music (R49).
 */
export function useRestAlert(): () => void {
  const player = useAudioPlayer(REST_SOUND);
  useEffect(() => {
    void setAudioModeAsync({ playsInSilentMode: false, interruptionMode: "mixWithOthers" });
  }, []);
  return () => {
    Vibration.vibrate(ALERT_VIBRATION);
    void player.seekTo(0).then(() => player.play());
  };
}
