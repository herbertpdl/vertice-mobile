import { fireEvent, render, screen } from "@testing-library/react-native";

import { SearchField } from "./SearchField";

describe("SearchField", () => {
  it("clears with the x, which only shows with text", async () => {
    const onChangeText = jest.fn();
    const { rerender } = await render(
      <SearchField value="" onChangeText={onChangeText} placeholder="Buscar aluno" />,
    );
    expect(screen.queryByRole("button", { name: "Limpar busca" })).toBeNull();
    await rerender(<SearchField value="ana" onChangeText={onChangeText} placeholder="Buscar aluno" />);
    await fireEvent.press(screen.getByRole("button", { name: "Limpar busca" }));
    expect(onChangeText).toHaveBeenCalledWith("");
    expect(screen.getByLabelText("Buscar aluno")).toBeOnTheScreen();
  });
});
