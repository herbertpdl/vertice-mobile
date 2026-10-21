import { fireEvent, render, screen } from "@testing-library/react-native";

import { SaveBar } from "./SaveBar";

describe("SaveBar", () => {
  it("shows the status and runs both buttons", async () => {
    const onDiscard = jest.fn();
    const onSave = jest.fn();
    await render(
      <SaveBar
        status={{ message: "Alterações não salvas", tone: "warning" }}
        secondary={{ label: "Descartar", onPress: onDiscard }}
        primary={{ label: "Salvar treino", onPress: onSave }}
      />,
    );
    expect(screen.getByText("Alterações não salvas")).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole("button", { name: "Descartar" }));
    await fireEvent.press(screen.getByRole("button", { name: "Salvar treino" }));
    expect(onDiscard).toHaveBeenCalled();
    expect(onSave).toHaveBeenCalled();
  });

  it("is busy while saving", async () => {
    await render(
      <SaveBar secondary={{ label: "Descartar", disabled: true, onPress: () => {} }} primary={{ label: "Salvando…", loading: true, onPress: () => {} }} />,
    );
    expect(screen.getByRole("button", { name: "Salvando…" })).toBeBusy();
    expect(screen.getByRole("button", { name: "Descartar" })).toBeDisabled();
  });
});
