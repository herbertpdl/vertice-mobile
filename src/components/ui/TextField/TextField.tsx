import { CircleAlert, Eye, EyeOff, type LucideIcon } from "lucide-react-native";
import { useState, type Ref } from "react";
import { Pressable, StyleSheet, TextInput, type StyleProp, type TextInputProps, type ViewStyle } from "react-native";

import { colors, space, textStyle } from "@/theme";

import { FieldFrame } from "../FieldFrame";

export type TextFieldProps = Omit<TextInputProps, "style" | "editable"> & {
  label: string;
  error?: string;
  help?: string;
  disabled?: boolean;
  /** M Password Field: masks the value and adds the eye toggle. */
  password?: boolean;
  /** A decorative glyph at the box's end (not interactive). */
  trailingIcon?: LucideIcon;
  ref?: Ref<TextInput>;
  style?: StyleProp<ViewStyle>;
};

/**
 * M Field (+ Focused / Error / Disabled / Password states). The error state adds the
 * `circle-alert` glyph; a password field keeps its eye toggle instead, so the value can still be
 * revealed while it's being corrected.
 */
export function TextField({
  label,
  error,
  help,
  disabled = false,
  password = false,
  trailingIcon: TrailingIcon,
  onFocus,
  onBlur,
  ref,
  style,
  accessibilityHint,
  ...inputProps
}: TextFieldProps) {
  const [focused, setFocused] = useState(false);
  const [revealed, setRevealed] = useState(false);

  return (
    <FieldFrame
      label={label}
      error={error}
      help={help}
      focused={focused}
      disabled={disabled}
      style={style}
    >
      <TextInput
        {...inputProps}
        ref={ref}
        editable={!disabled}
        secureTextEntry={password && !revealed}
        placeholderTextColor={colors.textTertiary}
        selectionColor={colors.primary}
        cursorColor={colors.primary}
        accessibilityLabel={label}
        accessibilityHint={error ?? accessibilityHint ?? help}
        accessibilityState={{ disabled }}
        onFocus={(event) => {
          setFocused(true);
          onFocus?.(event);
        }}
        onBlur={(event) => {
          setFocused(false);
          onBlur?.(event);
        }}
        style={[styles.input, disabled ? styles.inputDisabled : null]}
      />
      {password ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={revealed ? "Ocultar senha" : "Mostrar senha"}
          accessibilityState={{ disabled }}
          disabled={disabled}
          hitSlop={12}
          onPress={() => setRevealed((value) => !value)}
        >
          {revealed ? (
            <EyeOff size={20} color={colors.textSecondary} />
          ) : (
            <Eye size={20} color={colors.textSecondary} />
          )}
        </Pressable>
      ) : error !== undefined ? (
        <CircleAlert size={20} color={colors.danger} />
      ) : TrailingIcon === undefined ? null : (
        <TrailingIcon size={20} color={colors.textSecondary} />
      )}
    </FieldFrame>
  );
}

const styles = StyleSheet.create({
  input: {
    ...textStyle("bodyLg"),
    flex: 1,
    alignSelf: "stretch",
    paddingVertical: space[3],
    // Android's EditText adds theme padding; the box's own padding is the design's.
    paddingHorizontal: 0,
    color: colors.textPrimary,
  },
  inputDisabled: { color: colors.textTertiary },
});
