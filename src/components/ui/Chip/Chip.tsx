import { Pressable, StyleSheet, type PressableProps, type StyleProp, type ViewStyle } from "react-native";

import { colors, controls, radius } from "@/theme";

import { Text } from "../Text";

export type ChipProps = Omit<PressableProps, "children" | "style"> & {
  label: string;
  /** M Chip Selected: primary fill, no border. */
  selected?: boolean;
  style?: StyleProp<ViewStyle>;
};

/** M Chip: a 40-high filter pill ("Todos", "Com plano ativo", a muscle group). */
export function Chip({ label, selected = false, style, ...rest }: ChipProps) {
  return (
    <Pressable
      {...rest}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected }}
      style={({ pressed }) => [
        styles.base,
        selected
          ? styles.selected
          : { backgroundColor: pressed ? colors.surfaceHover : colors.surface },
        style,
      ]}
    >
      <Text variant="bodyStrong" color={selected ? "primaryText" : "textSecondary"} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    height: controls.chipHeight,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: controls.pillPaddingHorizontal,
    alignItems: "center",
    justifyContent: "center",
  },
  selected: { backgroundColor: colors.primary, borderColor: "transparent" },
});
