import { Pressable, type Insets } from "react-native";
import { KeyboardToolbar, type KeyboardToolbarProps } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { colors, space } from "@/theme";

const PALETTE = {
  primary: colors.primary,
  disabled: colors.textTertiary,
  background: colors.surface,
  ripple: colors.surfaceActive,
};
/** The app is dark-only, but the toolbar follows the keyboard's own appearance. */
const THEME: KeyboardToolbarProps["theme"] = { light: PALETTE, dark: PALETTE };
/** "Concluir" is only its text: this fills the bar's height, so a loose tap still closes the keyboard. */
const DONE_SLOP: Insets = { top: space[3], bottom: space[3], left: space[3], right: space[3] };

/** A bar button with its label in Portuguese: the library's are fixed, in English. */
export function barButton(label: string, hint: string, hitSlop?: Insets): NonNullable<KeyboardToolbarProps["button"]> {
  return function BarButton({ children, onPress, disabled, testID, style }) {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityHint={hint}
        accessibilityState={{ disabled }}
        android_ripple={{ color: colors.surfaceActive, borderless: true }}
        disabled={disabled}
        hitSlop={hitSlop}
        onPress={onPress}
        style={style}
        testID={testID}
      >
        {children}
      </Pressable>
    );
  };
}

const PrevButton = barButton("Campo anterior", "Vai para o campo anterior");
const NextButton = barButton("Próximo campo", "Vai para o próximo campo");
const DoneButton = barButton("Concluir", "Fecha o teclado", DONE_SLOP);

/**
 * The bar on top of the keyboard: previous/next field and "Concluir", which closes it. Number pads
 * and multi-line fields have no key that does. It shows only with the keyboard up. One sits at the
 * root and one in `SheetModal`, since a `Modal` draws over the root. What sits above the keyboard
 * clears it with `sizes.keyboardBarHeight`.
 */
export function KeyboardBar() {
  const insets = useSafeAreaInsets();
  return (
    <KeyboardToolbar theme={THEME} insets={insets}>
      <KeyboardToolbar.Prev button={PrevButton} />
      <KeyboardToolbar.Next button={NextButton} />
      <KeyboardToolbar.Done button={DoneButton} text="Concluir" />
    </KeyboardToolbar>
  );
}
