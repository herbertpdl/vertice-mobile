import { render, screen } from "@testing-library/react-native";
import { StyleSheet } from "react-native";

import { colors } from "@/theme";

import { StatCard } from "./StatCard";

describe("StatCard", () => {
  it("reads as one element and colors the helper", async () => {
    await render(<StatCard label="Planos vencendo" value="3" helper="próximos 7 dias" helperColor="warning" />);
    expect(screen.getByLabelText("Planos vencendo, 3, próximos 7 dias")).toBeOnTheScreen();
    expect(StyleSheet.flatten(screen.getByText("próximos 7 dias").props.style).color).toBe(colors.warning);
  });
});
