import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";

import { colors, radius } from "@/theme";

import { Text } from "../Text";

export type AvatarSize = 40 | 48 | 64;

export type AvatarProps = {
  name: string;
  /** M Avatar 40 / 48 / 64. */
  size?: AvatarSize;
  style?: StyleProp<ViewStyle>;
};

/** Initials font size per M Avatar size. */
const initialsSize: Record<AvatarSize, number> = { 40: 14, 48: 16, 64: 22 };

/** "Marina Costa" → "MC", "Ana" → "A", "  " → "?". First and last word, uppercased. */
export function initials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "?";
  const first = words[0][0];
  const last = words.length > 1 ? words[words.length - 1][0] : "";
  return `${first}${last}`.toLocaleUpperCase("pt-BR");
}

/**
 * M Avatar: initials on a `surfaceActive` disc. Decorative — the name is always printed next to
 * it — so it's hidden from screen readers.
 */
export function Avatar({ name, size = 48, style }: AvatarProps) {
  return (
    <View
      style={[styles.disc, { width: size, height: size }, style]}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <Text
        variant="bodyStrong"
        color="textSecondary"
        style={{ fontSize: initialsSize[size] }}
        allowFontScaling={false}
      >
        {initials(name)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  disc: {
    borderRadius: radius.full,
    backgroundColor: colors.surfaceActive,
    alignItems: "center",
    justifyContent: "center",
  },
});
