import { Check } from "lucide-react-native";
import { Pressable, StyleSheet, View } from "react-native";

import { colors, radius, sizes, space } from "@/theme";

import { Text } from "../Text";

export type OptionRowProps = {
  label: string;
  selected: boolean;
  onPress: () => void;
  /**
   * `single` = M Option Row (selected: primary 600 label + check, read as a radio);
   * `multiple` = M Checkbox Row (leading checkbox, read as a checkbox).
   */
  mode?: "single" | "multiple";
};

/** A 52 pt row in a picker sheet. */
export function OptionRow({ label, selected, onPress, mode = "single" }: OptionRowProps) {
  const single = mode === "single";
  return (
    <Pressable
      accessibilityRole={single ? "radio" : "checkbox"}
      accessibilityLabel={label}
      accessibilityState={{ checked: selected }}
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed ? styles.pressed : null]}
    >
      {single ? null : (
        <View style={[styles.box, selected ? styles.boxOn : styles.boxOff]}>
          {selected ? <Check size={16} color={colors.primaryText} strokeWidth={3} /> : null}
        </View>
      )}
      <Text
        variant="bodyLg"
        color={single && selected ? "primary" : "textPrimary"}
        weight={single && selected ? "semibold" : undefined}
        style={styles.label}
      >
        {label}
      </Text>
      {single && selected ? <Check size={20} color={colors.primary} /> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: sizes.optionRowHeight,
    flexDirection: "row",
    alignItems: "center",
    gap: space[3],
    paddingHorizontal: space[1],
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  pressed: { backgroundColor: colors.surfaceHover },
  label: { flex: 1 },
  box: { width: sizes.checkbox, height: sizes.checkbox, borderRadius: radius.sm, alignItems: "center", justifyContent: "center" },
  boxOn: { backgroundColor: colors.primary },
  boxOff: { borderWidth: 1.5, borderColor: colors.borderStrong },
});
