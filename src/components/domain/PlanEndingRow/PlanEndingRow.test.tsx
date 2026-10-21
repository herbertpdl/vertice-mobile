import { render, screen } from "@testing-library/react-native";
import { StyleSheet } from "react-native";

import { colors } from "@/theme";

import { PlanEndingRow } from "./PlanEndingRow";

const plan = (daysLeft: number) => ({ name: "Base", student: "Diego", end: "2026-10-30", daysLeft });

describe("PlanEndingRow", () => {
  it.each([
    [5, "5 dias", colors.warning],
    [0, "vence hoje", colors.warning],
    [9, "9 dias", colors.textSecondary],
  ])("%i days → '%s' in the right tone", async (days, label, color) => {
    await render(<PlanEndingRow plan={plan(days)} />);
    expect(StyleSheet.flatten(screen.getByText(label, { includeHiddenElements: true }).props.style).color).toBe(color);
  });
});
