import { fireEvent, render, screen } from "@testing-library/react-native";
import { Plus } from "lucide-react-native";
import { StyleSheet } from "react-native";

import { colors } from "@/theme";

import { Button } from "./Button";

const button = () => screen.getByRole("button");
const fill = () => StyleSheet.flatten(button().props.style).backgroundColor;

describe("Button", () => {
  it("presses, and exposes its label to screen readers", async () => {
    const onPress = jest.fn();
    await render(<Button label="Entrar" onPress={onPress} icon={Plus} />);
    await fireEvent.press(screen.getByRole("button", { name: "Entrar" }));
    expect(onPress).toHaveBeenCalledTimes(1);
    expect(fill()).toBe(colors.primary);
  });

  it.each([
    ["secondary", colors.surface],
    ["danger", colors.danger],
    ["ghost", "transparent"],
  ] as const)("%s uses its design fill", async (variant, expected) => {
    await render(<Button label="X" variant={variant} />);
    expect(fill()).toBe(expected);
  });

  it("disabled: filled variants turn surfaceActive with a tertiary label and don't press", async () => {
    const onPress = jest.fn();
    await render(<Button label="Salvar" disabled onPress={onPress} />);
    await fireEvent.press(button());
    expect(onPress).not.toHaveBeenCalled();
    expect(button()).toBeDisabled();
    expect(fill()).toBe(colors.surfaceActive);
    expect(StyleSheet.flatten(screen.getByText("Salvar").props.style).color).toBe(colors.textTertiary);
  });

  it("disabled secondary fades instead", async () => {
    await render(<Button label="Cancelar" variant="secondary" disabled />);
    expect(StyleSheet.flatten(button().props.style).opacity).toBe(0.45);
  });

  it("loading: busy, not pressable, dimmed", async () => {
    const onPress = jest.fn();
    await render(<Button label="Salvando…" loading onPress={onPress} />);
    await fireEvent.press(button());
    expect(onPress).not.toHaveBeenCalled();
    expect(button()).toBeBusy();
    expect(StyleSheet.flatten(button().props.style).opacity).toBe(0.75);
  });
});
