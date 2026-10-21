import { ChevronDown } from "lucide-react-native";
import { useState } from "react";
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";

import { sizes, space } from "@/theme";

import { Tag } from "../Badge";
import { Button } from "../Button";
import { OptionRow } from "../OptionRow";
import { PickerField, type PickerOption } from "../PickerField";
import { Sheet } from "../Sheet";

export type MultiSelectFieldProps<T extends string | number> = {
  label: string;
  values: T[];
  options: PickerOption<T>[];
  onChange: (values: T[]) => void;
  placeholder?: string;
  sheetTitle?: string;
  /** The "Aplicar" button stays disabled below this many choices (muscle groups: 1). */
  minSelected?: number;
  error?: string;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
};

/**
 * M Multi Select Field and M - Grupos Musculares (Sheet): the box shows the choices as M Tags
 * (clipped to one line, read out in full); the sheet edits a draft with M Checkbox Rows and only
 * commits it on "Aplicar (n)" — closing the sheet any other way discards the draft. Tags have no
 * remove "x" (the design hides it): choices are edited in the sheet.
 */
export function MultiSelectField<T extends string | number>({
  label,
  values,
  options,
  onChange,
  placeholder = "Selecione",
  sheetTitle,
  minSelected = 0,
  error,
  disabled,
  style,
}: MultiSelectFieldProps<T>) {
  const [draft, setDraft] = useState<T[] | null>(null);
  const chosen = options.filter((option) => values.includes(option.value));
  const spoken = chosen.map((option) => option.label).join(", ");

  const toggle = (value: T) =>
    setDraft((current) => {
      const list = current ?? values;
      return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
    });

  const count = draft?.length ?? 0;

  return (
    <>
      <PickerField
        label={label}
        display={
          chosen.length === 0 ? null : (
            <View style={styles.tags}>
              {chosen.map((option) => (
                <Tag key={String(option.value)} label={option.label} />
              ))}
            </View>
          )
        }
        accessibilityValue={chosen.length === 0 ? placeholder : spoken}
        placeholder={placeholder}
        icon={ChevronDown}
        error={error}
        disabled={disabled}
        onOpen={() => setDraft(values)}
        style={style}
        contentStyle={styles.boxContent}
      />
      <Sheet
        visible={draft !== null}
        onClose={() => setDraft(null)}
        title={sheetTitle ?? label}
        footer={
          <Button
            label={`Aplicar (${count})`}
            disabled={count < minSelected}
            style={styles.flex}
            onPress={() => {
              if (draft !== null) onChange(draft);
              setDraft(null);
            }}
          />
        }
      >
        <View>
          {options.map((option) => (
            <OptionRow
              key={String(option.value)}
              mode="multiple"
              label={option.label}
              selected={draft?.includes(option.value) ?? false}
              onPress={() => toggle(option.value)}
            />
          ))}
        </View>
      </Sheet>
    </>
  );
}

const styles = StyleSheet.create({
  tags: { flex: 1, flexDirection: "row", gap: sizes.multiSelectTagGap, overflow: "hidden" },
  flex: { flex: 1 },
  // M Multi Select Field's box padding: 10 before the tags, 12 after the chevron.
  boxContent: { paddingLeft: 10, paddingRight: space[3] },
});
