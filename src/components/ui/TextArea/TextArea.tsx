import { useState, type Ref } from "react";
import { StyleSheet, TextInput, type StyleProp, type TextInputProps, type ViewStyle } from "react-native";

import { colors, controls, textStyle } from "@/theme";

import { FieldFrame } from "../FieldFrame";
import { Text } from "../Text";

export type TextAreaProps = Omit<TextInputProps, "style" | "editable" | "multiline"> & {
  label: string;
  error?: string;
  help?: string;
  disabled?: boolean;
  /** Shows the "n / max" counter; also enforced as the input's `maxLength`. */
  maxLength?: number;
  ref?: Ref<TextInput>;
  style?: StyleProp<ViewStyle>;
};

/**
 * M Text Area: a 120-high multi-line M Field with an optional "112 / 2000" counter. The counter
 * counts UTF-16 units, like `maxLength` and the web's bounds (`bounds.ts`).
 */
export function TextArea({
  label,
  error,
  help,
  disabled = false,
  maxLength,
  value,
  onFocus,
  onBlur,
  ref,
  style,
  ...inputProps
}: TextAreaProps) {
  const [focused, setFocused] = useState(false);
  const length = value?.length ?? 0;

  return (
    <FieldFrame
      label={label}
      error={error}
      help={help}
      focused={focused}
      disabled={disabled}
      style={style}
      boxStyle={styles.box}
      trailingFooter={
        maxLength === undefined ? undefined : (
          <Text
            variant="small"
            color={length > maxLength ? "danger" : "textSecondary"}
            accessibilityLabel={`${length} de ${maxLength} caracteres`}
          >
            {`${length} / ${maxLength}`}
          </Text>
        )
      }
    >
      <TextInput
        {...inputProps}
        ref={ref}
        value={value}
        multiline
        textAlignVertical="top"
        maxLength={maxLength}
        editable={!disabled}
        placeholderTextColor={colors.textTertiary}
        selectionColor={colors.primary}
        cursorColor={colors.primary}
        accessibilityLabel={label}
        accessibilityHint={error ?? help}
        accessibilityState={{ disabled }}
        onFocus={(event) => {
          setFocused(true);
          onFocus?.(event);
        }}
        onBlur={(event) => {
          setFocused(false);
          onBlur?.(event);
        }}
        style={styles.input}
      />
    </FieldFrame>
  );
}

const styles = StyleSheet.create({
  box: {
    minHeight: controls.textAreaHeight,
    alignItems: "stretch",
    paddingVertical: controls.textAreaPaddingVertical,
  },
  input: {
    ...textStyle("bodyLgRelaxed"),
    flex: 1,
    padding: 0,
    color: colors.textPrimary,
    // The box's height minus its vertical padding and 1 pt borders, so a tap anywhere focuses it.
    minHeight: controls.textAreaHeight - 2 * controls.textAreaPaddingVertical - 2,
  },
});
