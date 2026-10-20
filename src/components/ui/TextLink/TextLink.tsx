import { Pressable, StyleSheet, type PressableProps, type StyleProp, type ViewStyle } from "react-native";

import { controls, type TextVariant } from "@/theme";

import { Text } from "../Text";

export type TextLinkProps = Omit<PressableProps, "children" | "style"> & {
  label: string;
  /** `bodyStrong` (14/600, "Ver todos") by default; the auth footers use `bodyMdStrong` (15). */
  variant?: Extract<TextVariant, "bodyStrong" | "bodyMdStrong">;
  /** `link` for navigation away (legal pages), `button` for an in-app action. */
  role?: "link" | "button";
  style?: StyleProp<ViewStyle>;
};

/** M Text Link: primary-colored pressable text in a 44 pt-high hit area. */
export function TextLink({ label, variant = "bodyStrong", role = "button", style, ...rest }: TextLinkProps) {
  return (
    <Pressable
      {...rest}
      accessibilityRole={role}
      accessibilityLabel={label}
      hitSlop={{ left: 8, right: 8 }}
      style={[styles.base, style]}
    >
      {({ pressed }) => (
        <Text variant={variant} color={pressed ? "primaryActive" : "primary"}>
          {label}
        </Text>
      )}
    </Pressable>
  );
}

export type InlineLinkProps = {
  label: string;
  onPress: () => void;
};

/**
 * A link inside running text ("Li e aceito os <termos de uso> e a <política de privacidade>"):
 * a nested `Text` so it wraps with the sentence, underlined as in the design. Render it inside a
 * `Text`. A nested `Text` can't take `hitSlop`, so give the sentence a comfortable line height
 * (`bodyRelaxed`) to keep the link easy to hit.
 */
export function InlineLink({ label, onPress }: InlineLinkProps) {
  return (
    <Text
      variant="bodyStrong"
      color="primary"
      accessibilityRole="link"
      onPress={onPress}
      suppressHighlighting={false}
      style={styles.inline}
    >
      {label}
    </Text>
  );
}

const styles = StyleSheet.create({
  base: { minHeight: controls.hitTarget, justifyContent: "center", alignItems: "center" },
  inline: { textDecorationLine: "underline" },
});
