import { View } from "react-native";
import Svg, { Ellipse, Path } from "react-native-svg";

import type { FeedbackRating } from "@/lib/labels";
import { RATINGS } from "@/lib/labels";
import { sizes } from "@/theme";

import { EMOJI_ART } from "./emojiArt";

export type RatingEmojiProps = {
  rating: FeedbackRating;
  /** 48 on the feedback scale (M Emoji), 20 in M Rating Chip. */
  size?: number;
  /** Read the rating's label; off when a parent already says it (the scale's option, the chip). */
  labelled?: boolean;
};

/**
 * M Emoji <rating>: the five custom faces of the feedback scale, from angry (Muito difícil) to
 * relaxed (Muito fácil), drawn from the pen.dev artwork on a 48×48 viewBox so every size stays
 * sharp. Illustration colors live with the artwork (`emojiArt.ts`), not in the theme.
 */
export function RatingEmoji({ rating, size = sizes.ratingEmoji, labelled = false }: RatingEmojiProps) {
  return (
    <View
      accessible={labelled}
      accessibilityRole={labelled ? "image" : undefined}
      accessibilityLabel={labelled ? RATINGS[rating] : undefined}
      accessibilityElementsHidden={!labelled}
      importantForAccessibility={labelled ? "yes" : "no-hide-descendants"}
    >
      <Svg width={size} height={size} viewBox="0 0 48 48">
        {EMOJI_ART[rating].map((shape, i) =>
          shape.kind === "ellipse" ? (
            <Ellipse
              key={i}
              cx={shape.cx}
              cy={shape.cy}
              rx={shape.rx}
              ry={shape.ry}
              fill={shape.fill}
              transform={"transform" in shape ? shape.transform : undefined}
            />
          ) : (
            <Path
              key={i}
              d={shape.d}
              transform={shape.transform}
              fill={"fill" in shape ? shape.fill : "none"}
              stroke={"stroke" in shape ? shape.stroke : undefined}
              strokeWidth={"strokeWidth" in shape ? shape.strokeWidth : undefined}
              strokeLinecap="round"
              vectorEffect="non-scaling-stroke"
            />
          ),
        )}
      </Svg>
    </View>
  );
}
