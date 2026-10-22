import { render, screen } from "@testing-library/react-native";

import { RATING_ORDER, RATINGS } from "@/lib/labels";

import { RatingEmoji } from "./RatingEmoji";
import { EMOJI_ART } from "./emojiArt";

describe("RatingEmoji", () => {
  it.each(RATING_ORDER)("draws %s from its artwork", (rating) => {
    expect(EMOJI_ART[rating].length).toBeGreaterThan(0);
  });

  it("is hidden from screen readers unless labelled", async () => {
    await render(<RatingEmoji rating="HARD" labelled />);
    expect(screen.getByLabelText(RATINGS.HARD)).toBeOnTheScreen();
  });

  it("is decorative by default", async () => {
    await render(<RatingEmoji rating="HARD" />);
    expect(screen.queryByLabelText(RATINGS.HARD)).toBeNull();
  });
});
