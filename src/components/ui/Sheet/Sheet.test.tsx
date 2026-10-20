import { fireEvent, render, screen } from "@testing-library/react-native";

import { Text } from "../Text";

import { Sheet } from "./Sheet";

describe("Sheet", () => {
  it("shows its title, content and footer; closes from the button", async () => {
    const onClose = jest.fn();
    await render(
      <Sheet visible onClose={onClose} title="Novo aluno" footer={<Text>Rodapé</Text>}>
        <Text>Campos</Text>
      </Sheet>,
    );
    expect(screen.getByRole("header", { name: "Novo aluno" })).toBeOnTheScreen();
    expect(screen.getByText("Campos")).toBeOnTheScreen();
    expect(screen.getByText("Rodapé")).toBeOnTheScreen();
    await fireEvent.press(screen.getAllByRole("button", { name: "Fechar" }).at(-1)!);
    expect(onClose).toHaveBeenCalled();
  });

  it("can't be dismissed while not dismissible", async () => {
    const onClose = jest.fn();
    await render(
      <Sheet visible onClose={onClose} title="Salvando" dismissible={false}>
        <Text>…</Text>
      </Sheet>,
    );
    for (const button of screen.getAllByRole("button", { name: "Fechar" })) await fireEvent.press(button);
    expect(onClose).not.toHaveBeenCalled();
  });

  it("renders nothing when hidden", async () => {
    await render(
      <Sheet visible={false} onClose={() => {}} title="Oculto">
        <Text>x</Text>
      </Sheet>,
    );
    expect(screen.queryByText("Oculto")).toBeNull();
  });
});
