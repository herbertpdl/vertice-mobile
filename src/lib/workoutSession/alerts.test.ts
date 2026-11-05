import { act, renderHook, waitFor } from "@testing-library/react-native";
import * as Audio from "expo-audio";
import * as Notifications from "expo-notifications";
import { Platform, Vibration } from "react-native";

import { useRestAlert, useRestNotification } from "./alerts";

const player = (Audio as unknown as { __player: { play: jest.Mock; seekTo: jest.Mock } }).__player;
const NOW = 1_000_000;
const rest = { setId: 11, startedAt: NOW, endsAt: NOW + 60_000 };
const notice = { title: "Descanso terminou", body: "Hora da série 2 de Remada." };

beforeEach(() => {
  jest.spyOn(Vibration, "vibrate").mockImplementation(() => {});
});

describe("useRestAlert", () => {
  it("vibrates in several long pulses, not one tap, and plays the chime", async () => {
    const { result } = await renderHook(() => useRestAlert());
    await act(async () => result.current());
    const pattern = jest.mocked(Vibration.vibrate).mock.calls[0][0];
    expect(Array.isArray(pattern) && pattern.length).toBeGreaterThanOrEqual(3);
    expect(player.seekTo).toHaveBeenCalledWith(0);
    expect(player.play).toHaveBeenCalled();
  });

  it("keeps the chime subject to the silent switch, mixing with the client's music", async () => {
    await renderHook(() => useRestAlert());
    expect(Audio.setAudioModeAsync).toHaveBeenCalledWith({ playsInSilentMode: false, interruptionMode: "mixWithOthers" });
  });
});

describe("useRestNotification", () => {
  const original = Platform.OS;
  afterEach(() => {
    Platform.OS = original;
  });

  it("schedules the chime as the notification's sound, on the rest channel", async () => {
    await renderHook(() => useRestNotification(rest, notice, () => NOW));
    await waitFor(() =>
      expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledWith({
        content: { ...notice, sound: "rest-done.wav" },
        trigger: { type: "timeInterval", seconds: 60, channelId: "rest-timer" },
      }),
    );
  });

  it("creates no channel on iOS", async () => {
    await renderHook(() => useRestNotification(rest, notice, () => NOW));
    await waitFor(() => expect(Notifications.scheduleNotificationAsync).toHaveBeenCalled());
    expect(Notifications.setNotificationChannelAsync).not.toHaveBeenCalled();
  });

  it("creates the high-importance channel on Android before scheduling", async () => {
    Platform.OS = "android";
    await renderHook(() => useRestNotification(rest, notice, () => NOW));
    await waitFor(() => expect(Notifications.scheduleNotificationAsync).toHaveBeenCalled());
    expect(Notifications.setNotificationChannelAsync).toHaveBeenCalledWith(
      "rest-timer",
      expect.objectContaining({ importance: 5, sound: "rest-done.wav", vibrationPattern: expect.any(Array) }),
    );
    expect(jest.mocked(Notifications.setNotificationChannelAsync).mock.invocationCallOrder[0]).toBeLessThan(
      jest.mocked(Notifications.scheduleNotificationAsync).mock.invocationCallOrder[0],
    );
  });
});
