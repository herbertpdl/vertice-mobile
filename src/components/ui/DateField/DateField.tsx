import { Calendar as CalendarIcon } from "lucide-react-native";
import { useState } from "react";
import type { StyleProp, ViewStyle } from "react-native";

import { formatDateNumeric } from "@/lib/format";

import { Calendar } from "../Calendar";
import { PickerField } from "../PickerField";
import { Sheet } from "../Sheet";

export type DateFieldProps = {
  label: string;
  /** A business date, `yyyy-MM-dd`, or null. No `Date` ever crosses this boundary. */
  value: string | null;
  onChange: (isoDate: string) => void;
  /** Inclusive bounds, `yyyy-MM-dd`. */
  min?: string;
  max?: string;
  placeholder?: string;
  error?: string;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
};

/**
 * M Date Field + M - Calendário (Sheet). The web's `DateField` is a masked `dd/mm/aaaa` text box;
 * on a phone the calendar sheet is the input (typing a date on a numeric keyboard with a mask is
 * slower than two taps), so the box only displays the value. Picking a day closes the sheet.
 */
export function DateField({
  label,
  value,
  onChange,
  min,
  max,
  placeholder = "dd/mm/aaaa",
  error,
  disabled,
  style,
}: DateFieldProps) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <PickerField
        label={label}
        display={value === null ? null : formatDateNumeric(value)}
        placeholder={placeholder}
        icon={CalendarIcon}
        error={error}
        disabled={disabled}
        onOpen={() => setOpen(true)}
        style={style}
      />
      <Sheet visible={open} onClose={() => setOpen(false)} title={label} scroll={false}>
        <Calendar
          value={value}
          min={min}
          max={max}
          onChange={(day) => {
            onChange(day);
            setOpen(false);
          }}
        />
      </Sheet>
    </>
  );
}
