import { renderHook } from "@testing-library/react-native";
import type { RefObject } from "react";
import { TextInput, type LayoutChangeEvent, type NativeScrollEvent, type NativeSyntheticEvent, type ScrollView } from "react-native";
import { FocusedInputEvents } from "react-native-keyboard-controller";

import { useRevealFocusedInput } from "./useRevealFocusedInput";

const GAP = 16;
const scrollTo = jest.fn();

/** The hook on a 200-high viewport scrolled to `offset`, with a field at `y`, 50 high, focused. */
async function reveal(y: number | null, offset = 0) {
  jest.spyOn(TextInput.State, "currentlyFocusedInput").mockReturnValue(
    (y === null
      ? null
      : { measureLayout: (_to: unknown, done: (x: number, y: number, w: number, h: number) => void) => done(0, y, 100, 50) }) as never,
  );
  const { result } = await renderHook(() => useRevealFocusedInput(GAP));
  (result.current.ref as RefObject<unknown>).current = { getInnerViewRef: () => ({}), scrollTo } as unknown as ScrollView;
  result.current.onLayout({ nativeEvent: { layout: { height: 200 } } } as LayoutChangeEvent);
  result.current.onScroll({ nativeEvent: { contentOffset: { y: offset } } } as NativeSyntheticEvent<NativeScrollEvent>);
  result.current.onContentSizeChange();
}

describe("useRevealFocusedInput", () => {
  it("scrolls down to a field below the viewport", async () => {
    await reveal(300);
    expect(scrollTo).toHaveBeenCalledWith({ y: 300 + 50 + GAP - 200 });
  });

  it("scrolls up to a field above the viewport", async () => {
    await reveal(100, 400);
    expect(scrollTo).toHaveBeenCalledWith({ y: 100 - GAP });
  });

  it("leaves a field already in view alone", async () => {
    await reveal(60);
    expect(scrollTo).not.toHaveBeenCalled();
  });

  it("does nothing with no field focused", async () => {
    await reveal(null);
    expect(scrollTo).not.toHaveBeenCalled();
  });

  it("follows the focus moving to another field", async () => {
    await renderHook(() => useRevealFocusedInput(GAP));
    expect(FocusedInputEvents.addListener).toHaveBeenCalledWith("focusDidSet", expect.any(Function));
  });
});
