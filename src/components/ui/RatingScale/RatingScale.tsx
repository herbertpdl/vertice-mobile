import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";

import { RATING_ORDER, RATINGS, type FeedbackRating } from "@/lib/labels";
import { colors, disabledOpacity, radius, sizes, space } from "@/theme";

import { RatingEmoji } from "../RatingEmoji";
import { Text } from "../Text";

export type RatingScaleProps = {
  value: FeedbackRating | null;
  onChange: (rating: FeedbackRating) => void;
  style?: StyleProp<ViewStyle>;
};

/**
 * M Rating Scale: the five M Rating Options, hardest first. A selected option gets the
 * `surfaceActive` card with a primary ring and label (M Rating Option Selected); the others show
 * their face faded. The options share the row (up to 68 pt each), so the scale fits a 320 pt
 * content width. Read as a radio group ("Como foi o treino?" is the screen's question).
 */
export function RatingScale({ value, onChange, style }: RatingScaleProps) {
  return (
    <View style={[styles.row, style]} accessibilityRole="radiogroup">
      {RATING_ORDER.map((rating) => {
        const selected = rating === value;
        return (
          <Pressable
            key={rating}
            accessibilityRole="radio"
            accessibilityLabel={RATINGS[rating]}
            accessibilityState={{ selected, checked: selected }}
            onPress={() => onChange(rating)}
            style={({ pressed }) => [styles.option, selected ? styles.selected : null, pressed ? styles.pressed : null]}
          >
            <View style={selected ? null : styles.faded}>
              <RatingEmoji rating={rating} />
            </View>
            <Text variant="tiny" color={selected ? "primary" : "textSecondary"} align="center" numberOfLines={1}>
              {RATINGS[rating]}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", gap: space[1] },
  option: {
    flex: 1,
    maxWidth: sizes.ratingOptionWidth,
    alignItems: "center",
    gap: space[2],
    paddingVertical: sizes.ratingOptionPaddingVertical,
    borderRadius: radius.lg,
    borderWidth: sizes.focusBorderWidth,
    borderColor: "transparent",
  },
  selected: { backgroundColor: colors.surfaceActive, borderColor: colors.primary },
  faded: { opacity: disabledOpacity.ratingOption },
  pressed: { backgroundColor: colors.surfaceHover },
});
