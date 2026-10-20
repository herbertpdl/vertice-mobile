import { fireEvent, render, screen } from "@testing-library/react-native";

import { ConfirmDialog } from "./ConfirmDialog";

const base = {
  visible: true,
  title: "Excluir plano?",
  message: "Essa ação não pode ser desfeita.",
  confirmLabel: "Excluir",
  onCancel: () => {},
};

describe("ConfirmDialog", () => {
  it("confirms through the single-flight guard", async () => {
    const onConfirm = jest.fn();
    await render(<ConfirmDialog {...base} onConfirm={onConfirm} />);
    await fireEvent.press(screen.getByRole("button", { name: "Excluir" }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it("shows the error and can't be cancelled while loading", async () => {
    const onCancel = jest.fn();
    await render(
      <ConfirmDialog {...base} onCancel={onCancel} onConfirm={() => {}} loading error="Não foi possível excluir." />,
    );
    expect(screen.getByText("Não foi possível excluir.")).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole("button", { name: "Cancelar" }));
    expect(onCancel).not.toHaveBeenCalled();
  });
});
