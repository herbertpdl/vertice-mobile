import { useEffect, useRef } from "react";
import { Keyboard, TextInput, type HostInstance, type LayoutChangeEvent, type NativeScrollEvent, type NativeSyntheticEvent, type ScrollView } from "react-native";
import { FocusedInputEvents } from "react-native-keyboard-controller";

/**
 * Keeps the focused field in view inside a sheet's scroll view. `KeyboardAwareScrollView` doesn't
 * fit here: it measures the field while `SheetModal`'s `KeyboardAvoidingView` is still lifting the
 * panel, so it overshoots. This waits for the keyboard to settle, and runs again when focus moves
 * to another field or a field grows.
 */
export function useRevealFocusedInput(gap: number) {
  const scroll = useRef<ScrollView>(null);
  const viewport = useRef({ height: 0, offset: 0 });

  const reveal = () => {
    const input = TextInput.State.currentlyFocusedInput();
    // Missing from the types, and `getInnerViewNode`'s tag doesn't work with `measureLayout` on Fabric.
    const content = (scroll.current as unknown as { getInnerViewRef(): HostInstance | null } | null)?.getInnerViewRef();
    if (input === null || content === null || content === undefined) return;
    input.measureLayout(
      content,
      (_x, y, _width, height) => {
        const { height: visible, offset } = viewport.current;
        if (y + height + gap > offset + visible) scroll.current?.scrollTo({ y: y + height + gap - visible });
        else if (y - gap < offset) scroll.current?.scrollTo({ y: Math.max(0, y - gap) });
      },
      () => {},
    );
  };

  useEffect(() => {
    const shown = Keyboard.addListener("keyboardDidShow", reveal);
    const moved = FocusedInputEvents.addListener("focusDidSet", reveal);
    return () => {
      shown.remove();
      moved.remove();
    };
    // `reveal` only reads refs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    ref: scroll,
    onLayout: (event: LayoutChangeEvent) => {
      viewport.current.height = event.nativeEvent.layout.height;
    },
    onScroll: (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      viewport.current.offset = event.nativeEvent.contentOffset.y;
    },
    onContentSizeChange: reveal,
    scrollEventThrottle: 16,
  };
}
