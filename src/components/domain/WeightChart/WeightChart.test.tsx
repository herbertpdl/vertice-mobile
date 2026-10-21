import { render, screen } from "@testing-library/react-native";

import { colors, sizes } from "@/theme";

import { recentWeeks, WeightChart } from "./WeightChart";

const TODAY = "2026-10-21"; // a Wednesday; this week's Monday is 19/10

describe("recentWeeks", () => {
  it("keeps the last 8 calendar weeks (this one included), oldest first", () => {
    const points = [
      { weekStartDate: "2026-08-24", weight: 30 }, // 9 weeks back: out
      { weekStartDate: "2026-10-19", weight: 50 },
      { weekStartDate: "2026-08-31", weight: 40 }, // 8th week back: in
      { weekStartDate: "2026-09-14", weight: 45 },
    ];
    expect(recentWeeks(points, TODAY).map((p) => p.weekStartDate)).toEqual(["2026-08-31", "2026-09-14", "2026-10-19"]);
  });
});

describe("WeightChart", () => {
  it("scales bars from zero to the heaviest, the latest week in full primary", async () => {
    await render(
      <WeightChart
        today={TODAY}
        points={[
          { weekStartDate: "2026-10-12", weight: 40 },
          { weekStartDate: "2026-10-19", weight: 50 },
        ]}
      />,
    );
    expect(screen.getByLabelText("semana de 12/10: 40 kg, semana de 19/10: 50 kg")).toBeOnTheScreen();
    const tree = JSON.stringify(screen.toJSON());
    expect(tree).toContain(`"height":${sizes.chartBarMaxHeight}`);
    expect(tree).toContain(`"height":${(40 / 50) * sizes.chartBarMaxHeight}`);
    expect(tree).toContain(`"backgroundColor":"${colors.primary}"`);
  });
});
