import { render, screen } from "@testing-library/react-native";
import { useReducedMotion } from "react-native-reanimated";

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

  it("keeps announcing `value` while filling across a span", async () => {
    const now = Date.now();
    await render(<ProgressBar value={0.25} span={{ startedAt: now - 15_000, endsAt: now + 45_000 }} accessibilityLabel="Descanso" />);
    expect(screen.getByRole("progressbar", { name: "Descanso" })).toHaveAccessibilityValue({ now: 25 });
  });

  it("steps with `value` under reduce motion", async () => {
    jest.mocked(useReducedMotion).mockReturnValueOnce(true);
    const now = Date.now();
    await render(<ProgressBar value={0.4} span={{ startedAt: now, endsAt: now + 60_000 }} accessibilityLabel="Descanso" />);
    expect(screen.getByRole("progressbar", { name: "Descanso" })).toHaveAccessibilityValue({ now: 40 });
  });
});
