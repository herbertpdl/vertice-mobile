import { render, screen } from "@testing-library/react-native";

import { RatingChip } from "./RatingChip";

describe("RatingChip", () => {
  it("shows and reads the rating", async () => {
    await render(<RatingChip rating="VERY_EASY" />);
    expect(screen.getByLabelText("Avaliação: Muito fácil")).toBeOnTheScreen();
    expect(screen.getByText("Muito fácil")).toBeOnTheScreen();
  });
});
