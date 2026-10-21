import { act, renderHook } from "@testing-library/react-native";

import { useSingleFlight } from "./useSingleFlight";

describe("useSingleFlight", () => {
  it("drops calls while one is pending, and allows the next after it settles", async () => {
    let resolve!: () => void;
    const action = jest.fn(() => new Promise<void>((r) => (resolve = r)));
    const { result } = await renderHook(() => useSingleFlight(action));

    let first!: Promise<void>;
    await act(async () => {
      first = result.current();
      void result.current();
      void result.current();
    });
    expect(action).toHaveBeenCalledTimes(1);

    await act(async () => {
      resolve();
      await first;
    });
    await act(async () => {
      void result.current();
    });
    expect(action).toHaveBeenCalledTimes(2);
    resolve();
  });

  it("releases the lock when the action throws", async () => {
    const action = jest.fn(async () => {
      throw new Error("boom");
    });
    const { result } = await renderHook(() => useSingleFlight(action));
    await act(async () => {
      await expect(result.current()).rejects.toThrow("boom");
    });
    await act(async () => {
      await expect(result.current()).rejects.toThrow("boom");
    });
    expect(action).toHaveBeenCalledTimes(2);
  });
});
