import { render, screen } from "@testing-library/react-native";

import { ProgressBar } from "./ProgressBar";

describe("ProgressBar", () => {
  it.each([
    [0.5, 50],
    [1.7, 100],
    [-1, 0],
    [Number.NaN, 0],
  ])("value %p → %p%%", async (value, percent) => {
    await render(<ProgressBar value={value} accessibilityLabel="Adesão" />);
    expect(screen.getByRole("progressbar", { name: "Adesão" })).toHaveAccessibilityValue({
      now: percent,
      text: `${percent}%`,
    });
  });
});
