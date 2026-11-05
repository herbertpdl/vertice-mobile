import { useEffect, useRef } from "react";
import { Keyboard, TextInput, type HostInstance, type LayoutChangeEvent, type NativeScrollEvent, type NativeSyntheticEvent, type ScrollView } from "react-native";
import { FocusedInputEvents } from "react-native-keyboard-controller";

/**
 * Keeps the focused field in view inside a sheet's scroll view. `KeyboardAwareScrollView` doesn't
 * fit here: it measures the field while `SheetModal`'s `KeyboardAvoidingView` is still lifting the
 * panel, so it overshoots. This waits for the keyboard to settle, and runs again when focus moves,
 * the panel shrinks or the field itself grows. Other content changing (a list's next page) leaves
 * the scroll position alone.
 */
export function useRevealFocusedInput(gap: number) {
  const scroll = useRef<ScrollView>(null);
  const viewport = useRef({ height: 0, offset: 0 });
  const measured = useRef<{ input: unknown; height: number } | null>(null);

  const reveal = (onlyIfFieldChanged = false) => {
    const input = TextInput.State.currentlyFocusedInput();
    // Missing from the types, and `getInnerViewNode`'s tag doesn't work with `measureLayout` on Fabric.
    const content = (scroll.current as unknown as { getInnerViewRef(): HostInstance | null } | null)?.getInnerViewRef();
    if (input === null || content === null || content === undefined) return;
    input.measureLayout(
      content,
      (_x, y, _width, height) => {
        const unchanged = measured.current?.input === input && measured.current.height === height;
        measured.current = { input, height };
        if (onlyIfFieldChanged && unchanged) return;
        const { height: visible, offset } = viewport.current;
        if (y + height + gap > offset + visible) scroll.current?.scrollTo({ y: y + height + gap - visible });
        else if (y - gap < offset) scroll.current?.scrollTo({ y: Math.max(0, y - gap) });
      },
      () => {},
    );
  };

  useEffect(() => {
    const shown = Keyboard.addListener("keyboardDidShow", () => reveal());
    // A frame later: on Android the event can arrive before `TextInput.State` has the new field.
    const moved = FocusedInputEvents.addListener("focusDidSet", () => requestAnimationFrame(() => reveal()));
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
      const { height } = event.nativeEvent.layout;
      const shrank = height < viewport.current.height;
      viewport.current.height = height;
      // On Android the keyboard event comes before the panel has shrunk.
      if (shrank) reveal();
    },
    onScroll: (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      viewport.current.offset = event.nativeEvent.contentOffset.y;
    },
    onContentSizeChange: () => reveal(true),
    scrollEventThrottle: 16,
  };
}
