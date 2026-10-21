import { ChevronDown } from "lucide-react-native";
import { useState } from "react";
import { View, type StyleProp, type ViewStyle } from "react-native";

import { OptionRow } from "../OptionRow";
import { PickerField, type PickerOption } from "../PickerField";
import { Sheet } from "../Sheet";

export type SelectFieldProps<T extends string> = {
  label: string;
  value: T | null;
  options: PickerOption<T>[];
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
        <View accessibilityRole="radiogroup">
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
        </View>
      </Sheet>
    </>
  );
}
