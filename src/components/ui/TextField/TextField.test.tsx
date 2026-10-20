import { fireEvent, render, screen } from "@testing-library/react-native";
import { StyleSheet } from "react-native";

import { colors } from "@/theme";

import { TextField } from "./TextField";

const input = (name: string) => screen.getByLabelText(name);

describe("TextField", () => {
  it("is labelled, typed into, and shows help", async () => {
    const onChangeText = jest.fn();
    await render(<TextField label="E-mail" help="Usado para entrar" onChangeText={onChangeText} />);
    await fireEvent.changeText(input("E-mail"), "ana@vertice.fit");
    expect(onChangeText).toHaveBeenCalledWith("ana@vertice.fit");
    expect(screen.getByText("Usado para entrar")).toBeOnTheScreen();
  });

  it("shows the error instead of help, and gives it to screen readers as the hint", async () => {
    await render(<TextField label="E-mail" help="ajuda" error="Informe um e-mail válido." />);
    expect(screen.getByText("Informe um e-mail válido.")).toBeOnTheScreen();
    expect(screen.queryByText("ajuda")).toBeNull();
    expect(input("E-mail").props.accessibilityHint).toBe("Informe um e-mail válido.");
  });

  it("turns the box border primary while focused", async () => {
    await render(<TextField label="Nome" />);
    const box = () => StyleSheet.flatten(input("Nome").parent?.props.style);
    await fireEvent(input("Nome"), "focus");
    expect(box()).toMatchObject({ borderColor: colors.primary, borderWidth: 1.5 });
    await fireEvent(input("Nome"), "blur");
    expect(box().borderColor).toBe(colors.border);
  });

  it("password: masked until the eye is pressed", async () => {
    await render(<TextField label="Senha" password />);
    expect(input("Senha").props.secureTextEntry).toBe(true);
    await fireEvent.press(screen.getByRole("button", { name: "Mostrar senha" }));
    expect(input("Senha").props.secureTextEntry).toBe(false);
    expect(screen.getByRole("button", { name: "Ocultar senha" })).toBeOnTheScreen();
  });

  it("disabled is not editable", async () => {
    await render(<TextField label="CPF" disabled />);
    expect(input("CPF").props.editable).toBe(false);
  });
});
