import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";

import { RATINGS, type FeedbackRating } from "@/lib/labels";
import { colors, radius, sizes, space } from "@/theme";

import { RatingEmoji } from "../RatingEmoji";
import { Text } from "../Text";

export type RatingChipProps = {
  rating: FeedbackRating;
  style?: StyleProp<ViewStyle>;
};

/** M Rating Chip: the 20 pt face and its label on a `surfaceActive` pill — a rating in a feedback row. */
export function RatingChip({ rating, style }: RatingChipProps) {
  return (
    <View style={[styles.chip, style]} accessible accessibilityLabel={`Avaliação: ${RATINGS[rating]}`}>
      <RatingEmoji rating={rating} size={sizes.ratingChipEmoji} />
      <Text variant="smallStrong">{RATINGS[rating]}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: "row",
    alignSelf: "flex-start",
    alignItems: "center",
    gap: sizes.ratingChipGap,
    paddingVertical: sizes.ratingChipPaddingVertical,
    paddingLeft: space[1],
    paddingRight: sizes.ratingChipPaddingRight,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceActive,
  },
});
