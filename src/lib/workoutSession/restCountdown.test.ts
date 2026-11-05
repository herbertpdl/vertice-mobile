import { renderHook, waitFor } from "@testing-library/react-native";
import { existsSync } from "fs";
import { join } from "path";
import * as Notifications from "expo-notifications";
import * as Widgets from "expo-widgets";
import { Platform } from "react-native";

import RestCountdownAndroid from "../../../modules/rest-countdown";

import { endRestCountdown, useRestCountdown } from "./restCountdown";

jest.mock("../../../modules/rest-countdown", () => ({ __esModule: true, default: { show: jest.fn(), hide: jest.fn() } }));

const factory = (Widgets as unknown as { __factory: { start: jest.Mock; getInstances: jest.Mock } }).__factory;
const NOW = 1_000_000;
const rest = { setId: 11, startedAt: NOW, endsAt: NOW + 60_000 };
const next = { setId: 12, startedAt: NOW + 5000, endsAt: NOW + 65_000 };
const activity = () => ({ end: jest.fn(async () => undefined) });
const render = (timer: typeof rest | null) =>
  renderHook(({ value }: { value: typeof rest | null }) => useRestCountdown(value, "Próxima: série 2", () => NOW), {
    initialProps: { value: timer },
  });

describe("RestActivity's platform files", () => {
  // Metro tries `.ts` before `.tsx`, so a `.ts` stub would replace the Live Activity on iOS too. Jest
  // resolves these differently and the failure is silent, so nothing else would catch it.
  it("share one extension, so iOS gets the real one", () => {
    expect(existsSync(join(__dirname, "RestActivity.ios.tsx"))).toBe(true);
    expect(existsSync(join(__dirname, "RestActivity.tsx"))).toBe(true);
    expect(existsSync(join(__dirname, "RestActivity.ts"))).toBe(false);
  });
});

describe("useRestCountdown on iOS", () => {
  it("starts an activity going stale when the rest ends", async () => {
    await render(rest);
    expect(factory.start).toHaveBeenCalledWith(
      { startedAt: rest.startedAt, endsAt: rest.endsAt, caption: "Próxima: série 2" },
      undefined,
      new Date(rest.endsAt),
    );
  });

  it("starts nothing without a rest, or for one already over", async () => {
    await render(null);
    await render({ ...rest, endsAt: NOW - 1 });
    expect(factory.start).not.toHaveBeenCalled();
  });

  it("replaces the activity when another rest starts", async () => {
    const { rerender } = await render(rest);
    const running = activity();
    factory.getInstances.mockReturnValue([running]);
    await rerender({ value: next });
    expect(running.end).toHaveBeenCalledWith("immediate");
    expect(factory.start).toHaveBeenCalledTimes(2);
    factory.getInstances.mockReturnValue([]);
  });

  it("ends the activity when the rest ends", async () => {
    const { rerender } = await render(rest);
    const running = activity();
    factory.getInstances.mockReturnValue([running]);
    await rerender({ value: null });
    expect(running.end).toHaveBeenCalledWith("immediate");
    factory.getInstances.mockReturnValue([]);
  });

  it("ends one left behind by a closed app before starting", async () => {
    const leftover = activity();
    factory.getInstances.mockReturnValueOnce([leftover]);
    await render(rest);
    expect(leftover.end).toHaveBeenCalledWith("immediate");
    expect(factory.start).toHaveBeenCalledTimes(1);
  });

  it("doesn't restart for a render of the same rest", async () => {
    const { rerender } = await render(rest);
    await rerender({ value: { ...rest } });
    expect(factory.start).toHaveBeenCalledTimes(1);
  });

  it("never lets a failure reach the rest", async () => {
    factory.start.mockImplementationOnce(() => {
      throw new Error("Live Activities are disabled");
    });
    await expect(render(rest)).resolves.toBeDefined();
    factory.getInstances.mockImplementationOnce(() => {
      throw new Error("unavailable");
    });
    expect(() => endRestCountdown()).not.toThrow();
  });

  it("survives an activity that fails to end", async () => {
    factory.getInstances.mockReturnValueOnce([{ end: jest.fn(async () => Promise.reject(new Error("gone"))) }]);
    expect(() => endRestCountdown()).not.toThrow();
    await Promise.resolve();
  });
});

describe("useRestCountdown on Android", () => {
  const original = Platform.OS;
  beforeEach(() => {
    Platform.OS = "android";
  });
  afterEach(() => {
    Platform.OS = original;
  });

  it("posts the countdown, then takes it off, without touching Live Activities", async () => {
    const { rerender } = await render(rest);
    await waitFor(() => expect(RestCountdownAndroid?.show).toHaveBeenCalledWith(rest.endsAt, "Descanso", "Próxima: série 2"));
    jest.mocked(RestCountdownAndroid!.hide).mockClear();
    await rerender({ value: null });
    expect(RestCountdownAndroid?.hide).toHaveBeenCalled();
    expect(factory.start).not.toHaveBeenCalled();
  });

  it("waits for the first rest's permission prompt, and shows nothing if refused", async () => {
    jest.mocked(Notifications.getPermissionsAsync).mockResolvedValueOnce({ status: "denied", canAskAgain: false } as never);
    await render(rest);
    await waitFor(() => expect(Notifications.getPermissionsAsync).toHaveBeenCalled());
    await Promise.resolve();
    expect(RestCountdownAndroid?.show).not.toHaveBeenCalled();
  });

  it("doesn't show a rest that ended while the permission was being asked", async () => {
    let answer: (value: unknown) => void = () => {};
    jest.mocked(Notifications.getPermissionsAsync).mockReturnValueOnce(new Promise((resolve) => (answer = resolve)) as never);
    const { rerender } = await render(rest);
    await rerender({ value: null });
    answer({ status: "granted", canAskAgain: true });
    await waitFor(() => expect(Notifications.getPermissionsAsync).toHaveBeenCalled());
    await Promise.resolve();
    expect(RestCountdownAndroid?.show).not.toHaveBeenCalled();
  });
});
