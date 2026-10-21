import { X } from "lucide-react-native";
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";

import { colors, radius, sizes, space, TINT_ALPHA, withAlpha, type ColorToken } from "@/theme";

import { Text } from "../Text";

export type BadgeTone = "neutral" | "success" | "warning" | "danger" | "info" | "outline";

export type BadgeProps = {
  label: string;
  /**
   * `neutral` = M Badge, `success`/`warning`/`danger`/`info` = M Badge <Tone> (the tone's color
   * at ~12% behind its own color), `outline` = M Badge Outline ("Padrão").
   */
  tone?: BadgeTone;
  style?: StyleProp<ViewStyle>;
};

const tones: Record<BadgeTone, { fill: string; label: ColorToken; border?: string }> = {
  neutral: { fill: colors.surfaceHover, label: "textSecondary" },
  success: { fill: withAlpha(colors.success, TINT_ALPHA), label: "success" },
  warning: { fill: withAlpha(colors.warning, TINT_ALPHA), label: "warning" },
  danger: { fill: withAlpha(colors.danger, TINT_ALPHA), label: "danger" },
  info: { fill: withAlpha(colors.info, TINT_ALPHA), label: "info" },
  outline: { fill: "transparent", label: "textSecondary", border: colors.borderStrong },
};

/** M Badge: a status label ("Ativo", "5 dias", "Encerrado"). Not interactive. */
export function Badge({ label, tone = "neutral", style }: BadgeProps) {
  const look = tones[tone];
  return (
    <View
      style={[
        styles.badge,
        { backgroundColor: look.fill },
        look.border === undefined ? null : { borderWidth: 1, borderColor: look.border },
        style,
      ]}
    >
      <Text variant="smallStrong" color={look.label} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

export type CountPillProps = {
  count: number;
  /** What is being counted, for screen readers ("6 feedbacks"). */
  accessibilityLabel?: string;
};

/** M Count Pill: the cyan count next to a tab label ("Feedbacks 6"). */
export function CountPill({ count, accessibilityLabel }: CountPillProps) {
  return (
    <View style={styles.pill} accessibilityLabel={accessibilityLabel} accessible={accessibilityLabel !== undefined}>
      <Text variant="smallBold" color="primaryText">
        {String(count)}
      </Text>
    </View>
  );
}

export type TagProps = {
  label: string;
  /** Adds the `x` glyph; the whole tag becomes the remove button. */
  onRemove?: () => void;
};

/** M Tag: a selected value inside a field (a chosen muscle group). */
export function Tag({ label, onRemove }: TagProps) {
  const content = (
    <>
      <Text variant="label" color="textPrimary" numberOfLines={1}>
        {label}
      </Text>
      {onRemove === undefined ? null : <X size={14} color={colors.textSecondary} />}
    </>
  );
  if (onRemove === undefined) return <View style={styles.tag}>{content}</View>;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Remover ${label}`}
      hitSlop={{ top: 8, bottom: 8 }}
      onPress={onRemove}
      style={styles.tag}
    >
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: "flex-start",
    borderRadius: radius.full,
    paddingVertical: space[1],
    paddingHorizontal: sizes.badgePaddingHorizontal,
    alignItems: "center",
    justifyContent: "center",
  },
  pill: {
    borderRadius: radius.full,
    backgroundColor: colors.primary,
    paddingVertical: sizes.countPillPaddingVertical,
    paddingHorizontal: sizes.countPillPaddingHorizontal,
    alignItems: "center",
    justifyContent: "center",
  },
  tag: {
    height: sizes.tagHeight,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceActive,
    paddingHorizontal: space[3],
    flexDirection: "row",
    alignItems: "center",
    gap: space[1],
  },
});
