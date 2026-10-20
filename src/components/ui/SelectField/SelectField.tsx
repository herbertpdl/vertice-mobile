import { ChevronDown, type LucideIcon } from "lucide-react-native";
import { useState, type ReactNode } from "react";
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";

import { colors, controls, space } from "@/theme";

import { FieldFrame } from "../FieldFrame";
import { OptionRow } from "../OptionRow";
import { Sheet } from "../Sheet";
import { Text } from "../Text";

export type SelectOption<T extends string> = { value: T; label: string };

type PickerFieldProps = {
  label: string;
  /** What the box shows: the chosen value's text, or null for the placeholder. */
  display: ReactNode | null;
  placeholder: string;
  icon: LucideIcon;
  error?: string;
  disabled?: boolean;
  onOpen: () => void;
  /** The spoken value (defaults to `display` when it is a string). */
  accessibilityValue?: string;
  style?: StyleProp<ViewStyle>;
  /** Box padding override (M Multi Select Field: 10 left, 12 right). */
  boxStyle?: StyleProp<ViewStyle>;
};

/**
 * The tappable M Field box behind `SelectField`, `MultiSelectField` and `DateField`: the value
 * (or the tertiary placeholder) and a trailing glyph; the whole box opens the picker sheet.
 */
export function PickerField({
  label,
  display,
  placeholder,
  icon: Icon,
  error,
  disabled = false,
  onOpen,
  accessibilityValue,
  style,
  boxStyle,
}: PickerFieldProps) {
  const spoken = accessibilityValue ?? (typeof display === "string" ? display : placeholder);
  return (
    <FieldFrame label={label} error={error} disabled={disabled} style={style} boxStyle={[styles.box, boxStyle]}>
      <Pressable
        style={styles.press}
        onPress={onOpen}
        disabled={disabled}
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${spoken}`}
        accessibilityHint={error}
        accessibilityState={{ disabled }}
      >
        {display === null ? (
          <Text variant="bodyLg" color="textTertiary" style={styles.flex} numberOfLines={1}>
            {placeholder}
          </Text>
        ) : typeof display === "string" ? (
          <Text variant="bodyLg" style={styles.flex} numberOfLines={1}>
            {display}
          </Text>
        ) : (
          display
        )}
        <Icon size={20} color={colors.textSecondary} />
      </Pressable>
    </FieldFrame>
  );
}

export type SelectFieldProps<T extends string> = {
  label: string;
  value: T | null;
  options: SelectOption<T>[];
  onChange: (value: T) => void;
  placeholder?: string;
  /** The sheet's title; defaults to the label. */
  sheetTitle?: string;
  error?: string;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
};

/**
 * M Select Field (+ Filled / Error) and its M - Selecionar (Sheet): a single-select list of
 * M Option Rows that closes as soon as an option is tapped (no footer — the design's rule).
 */
export function SelectField<T extends string>({
  label,
  value,
  options,
  onChange,
  placeholder = "Selecione",
  sheetTitle,
  error,
  disabled,
  style,
}: SelectFieldProps<T>) {
  const [open, setOpen] = useState(false);
  const selected = options.find((option) => option.value === value);
  return (
    <>
      <PickerField
        label={label}
        display={selected?.label ?? null}
        placeholder={placeholder}
        icon={ChevronDown}
        error={error}
        disabled={disabled}
        onOpen={() => setOpen(true)}
        style={style}
      />
      <Sheet visible={open} onClose={() => setOpen(false)} title={sheetTitle ?? label}>
        <PickerOptions>
          {options.map((option) => (
            <OptionRow
              key={option.value}
              label={option.label}
              selected={option.value === value}
              onPress={() => {
                onChange(option.value);
                setOpen(false);
              }}
            />
          ))}
        </PickerOptions>
      </Sheet>
    </>
  );
}

/** Groups option rows so they sit flush, without the sheet content's gap between them. */
export function PickerOptions({ children }: { children: ReactNode }) {
  return <View accessibilityRole="radiogroup">{children}</View>;
}

const styles = StyleSheet.create({
  box: { paddingHorizontal: 0 },
  press: {
    flex: 1,
    alignSelf: "stretch",
    flexDirection: "row",
    alignItems: "center",
    gap: controls.fieldContentGap,
    paddingHorizontal: space[4],
  },
  flex: { flex: 1 },
});
