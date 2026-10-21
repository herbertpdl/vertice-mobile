import type { LucideIcon } from "lucide-react-native";
import type { ReactNode } from "react";
import { Pressable, StyleSheet, type StyleProp, type ViewStyle } from "react-native";

import { colors, controls, space } from "@/theme";

import { FieldFrame } from "../FieldFrame";
import { Text } from "../Text";

/** An option of a picker field (`SelectField`, `MultiSelectField`). */
export type PickerOption<T extends string | number> = { value: T; label: string };

export type PickerFieldProps = {
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
  /** Horizontal padding override inside the box (M Multi Select Field: 10 left, 12 right). */
  contentStyle?: StyleProp<ViewStyle>;
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
  contentStyle,
}: PickerFieldProps) {
  const spoken = accessibilityValue ?? (typeof display === "string" ? display : placeholder);
  return (
    <FieldFrame label={label} error={error} disabled={disabled} style={style} boxStyle={styles.box}>
      <Pressable
        style={[styles.press, contentStyle]}
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
