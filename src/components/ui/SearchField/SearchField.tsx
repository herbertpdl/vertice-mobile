import { Search, X } from "lucide-react-native";
import type { Ref } from "react";
import { Pressable, StyleSheet, TextInput, View, type StyleProp, type TextInputProps, type ViewStyle } from "react-native";

import { colors, controls, fontFamilies, radius, space } from "@/theme";

export type SearchFieldProps = Omit<TextInputProps, "style" | "onChangeText" | "value"> & {
  value: string;
  onChangeText: (text: string) => void;
  /** Read as the input's label; defaults to the placeholder. */
  accessibilityLabel?: string;
  ref?: Ref<TextInput>;
  style?: StyleProp<ViewStyle>;
};

/** M Search Field: a 48-high pill with a search glyph, plus a clear button once there's text. */
export function SearchField({
  value,
  onChangeText,
  placeholder = "Buscar",
  accessibilityLabel,
  ref,
  style,
  ...inputProps
}: SearchFieldProps) {
  return (
    <View style={[styles.box, style]}>
      <Search size={18} color={colors.textTertiary} />
      <TextInput
        {...inputProps}
        ref={ref}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textTertiary}
        selectionColor={colors.primary}
        cursorColor={colors.primary}
        returnKeyType="search"
        autoCorrect={false}
        accessibilityRole="search"
        accessibilityLabel={accessibilityLabel ?? placeholder}
        style={styles.input}
      />
      {value === "" ? null : (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Limpar busca"
          hitSlop={12}
          onPress={() => onChangeText("")}
        >
          <X size={18} color={colors.textSecondary} />
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    height: controls.searchHeight,
    backgroundColor: colors.surface,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: controls.pillPaddingHorizontal,
    flexDirection: "row",
    alignItems: "center",
    gap: controls.fieldContentGap,
  },
  input: {
    flex: 1,
    alignSelf: "stretch",
    paddingVertical: space[2],
    fontFamily: fontFamilies.base.regular,
    fontSize: 16,
    color: colors.textPrimary,
  },
});
