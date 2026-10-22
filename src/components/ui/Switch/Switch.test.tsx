import { fireEvent, render, screen } from "@testing-library/react-native";
import { StyleSheet } from "react-native";

import { colors } from "@/theme";

import { Switch } from "./Switch";

describe("Switch", () => {
  it("toggles and reports its state", async () => {
    const onValueChange = jest.fn();
    await render(<Switch value={false} onValueChange={onValueChange} accessibilityLabel="Mostrar e-mail" />);
    const sw = screen.getByRole("switch", { name: "Mostrar e-mail" });
    expect(sw).not.toBeChecked();
    expect(StyleSheet.flatten(sw.props.style)).toMatchObject({ backgroundColor: colors.surfaceActive });
    await fireEvent.press(sw);
    expect(onValueChange).toHaveBeenCalledWith(true);
  });

  it("draws the on track in primary", async () => {
    await render(<Switch value onValueChange={() => {}} accessibilityLabel="Mostrar WhatsApp" />);
    const sw = screen.getByRole("switch");
    expect(sw).toBeChecked();
    expect(StyleSheet.flatten(sw.props.style)).toMatchObject({ backgroundColor: colors.primary });
  });

  it("does nothing when disabled", async () => {
    const onValueChange = jest.fn();
    await render(<Switch value onValueChange={onValueChange} accessibilityLabel="x" disabled />);
    await fireEvent.press(screen.getByRole("switch"));
    expect(onValueChange).not.toHaveBeenCalled();
  });
});
