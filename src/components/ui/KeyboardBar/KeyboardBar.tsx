import { KeyboardToolbar, type KeyboardToolbarProps } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { colors } from "@/theme";

const PALETTE = {
  primary: colors.primary,
  disabled: colors.textTertiary,
  background: colors.surface,
  ripple: colors.surfaceActive,
};
/** The app is dark-only, but the toolbar follows the keyboard's own appearance. */
const THEME: KeyboardToolbarProps["theme"] = { light: PALETTE, dark: PALETTE };

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
      <KeyboardToolbar.Prev />
      <KeyboardToolbar.Next />
      <KeyboardToolbar.Done text="Concluir" />
    </KeyboardToolbar>
  );
}
