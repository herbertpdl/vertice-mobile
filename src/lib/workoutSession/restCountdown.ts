import { useEffect } from "react";
import { Platform } from "react-native";

import RestCountdownAndroid from "../../../modules/rest-countdown";

import RestActivity from "./RestActivity";
import { ensureNotificationPermission } from "./alerts";
import type { Timer } from "./engine";

/**
 * The running rest on the locked screen (PRD R50a): a Live Activity on iOS, an ongoing notification
 * on Android, both counted down by the system. It's a convenience: anything failing here (Live
 * Activities off in Settings, an old iOS) is silent, and never gets in the way of the rest.
 */
function attempt(run: () => void) {
  try {
    run();
  } catch {
    // The rest goes on, and its notification still fires.
  }
}

/** Ends what's on the lock screen, including anything a closed app left there. */
export function endRestCountdown() {
  attempt(() => {
    if (Platform.OS === "ios") for (const activity of RestActivity.getInstances()) void activity.end("immediate").catch(() => {});
    else RestCountdownAndroid?.hide();
  });
}

/** Android's needs the notification permission, which the first rest may still be asking for. */
function showOnAndroid(rest: Timer, caption: string, cancelled: () => boolean) {
  void ensureNotificationPermission()
    .then((granted) => {
      if (granted && !cancelled()) attempt(() => RestCountdownAndroid?.show(rest.endsAt, "Descanso", caption));
    })
    .catch(() => {});
}

/** Keeps the lock screen on the running rest: a new rest replaces it, no rest ends it. */
export function useRestCountdown(rest: Timer | null, caption: string, now: () => number) {
  const key = rest === null ? null : `${rest.setId}:${rest.endsAt}`;
  useEffect(() => {
    if (rest === null || rest.endsAt <= now()) return;
    // A rest resumed after the app closed may still be up there.
    endRestCountdown();
    let cancelled = false;
    if (Platform.OS === "ios") {
      attempt(() => RestActivity.start({ startedAt: rest.startedAt, endsAt: rest.endsAt, caption }, undefined, new Date(rest.endsAt)));
    } else {
      showOnAndroid(rest, caption, () => cancelled);
    }
    return () => {
      cancelled = true;
      endRestCountdown();
    };
    // It follows the rest itself (set and end time), not each render's objects.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
}
