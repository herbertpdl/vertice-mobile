import { onlineManager } from "@tanstack/react-query";
import { act, renderHook } from "@testing-library/react-native";

import { useIsOffline } from "./network";

describe("useIsOffline", () => {
  afterEach(() => onlineManager.setOnline(true));

  it("follows React Query's online state", async () => {
    const { result } = await renderHook(() => useIsOffline());
    expect(result.current).toBe(false);
    await act(async () => onlineManager.setOnline(false));
    expect(result.current).toBe(true);
  });
});
