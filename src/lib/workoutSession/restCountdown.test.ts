import { renderHook } from "@testing-library/react-native";
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
    expect(RestCountdownAndroid?.show).toHaveBeenCalledWith(rest.endsAt, "Descanso", "Próxima: série 2");
    jest.mocked(RestCountdownAndroid!.hide).mockClear();
    await rerender({ value: null });
    expect(RestCountdownAndroid?.hide).toHaveBeenCalled();
    expect(factory.start).not.toHaveBeenCalled();
  });
});
