import { render, screen } from "@testing-library/react-native";

import { WeightChart } from "./WeightChart";

describe("WeightChart", () => {
  it("shows the last eight weeks in order", async () => {
    const points = Array.from({ length: 10 }, (_, i) => ({
      weekStartDate: `2026-${String(Math.floor(i / 4) + 7).padStart(2, "0")}-${String((i % 4) * 7 + 1).padStart(2, "0")}`,
      weight: 40 + i,
    }));
    await render(<WeightChart points={[...points].reverse()} />);
    expect(screen.getByText("kg · últimas 8 semanas")).toBeOnTheScreen();
    const label = screen.getByRole("image").props.accessibilityLabel as string;
    expect(label.split(", ")).toHaveLength(8);
    expect(label.endsWith("49 kg")).toBe(true);
  });
});
