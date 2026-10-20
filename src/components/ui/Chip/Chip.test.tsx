import { fireEvent, render, screen } from "@testing-library/react-native";
import { StyleSheet } from "react-native";

import { colors } from "@/theme";

import { Chip } from "./Chip";

describe("Chip", () => {
  it("reports selection and uses the primary fill when selected", async () => {
    const onPress = jest.fn();
    await render(<Chip label="Todos" selected onPress={onPress} />);
    const chip = screen.getByRole("button", { name: "Todos" });
    expect(chip).toBeSelected();
    expect(StyleSheet.flatten(chip.props.style).backgroundColor).toBe(colors.primary);
    await fireEvent.press(chip);
    expect(onPress).toHaveBeenCalled();
  });

  it("unselected is a surface pill", async () => {
    await render(<Chip label="Sem plano" />);
    const chip = screen.getByRole("button", { name: "Sem plano" });
    expect(chip).not.toBeSelected();
    expect(StyleSheet.flatten(chip.props.style).backgroundColor).toBe(colors.surface);
  });
});
