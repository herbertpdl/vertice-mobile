import { fireEvent, render, screen } from "@testing-library/react-native";

import { SelectField } from "./SelectField";

const options = [
  { value: "BEGINNER", label: "Iniciante" },
  { value: "ADVANCED", label: "Avançado" },
] as const;

describe("SelectField", () => {
  it("opens the sheet, picks an option and closes", async () => {
    const onChange = jest.fn();
    await render(<SelectField label="Nível" value={null} options={[...options]} onChange={onChange} />);
    await fireEvent.press(screen.getByRole("button", { name: "Nível: Selecione" }));
    await fireEvent.press(screen.getByRole("radio", { name: "Avançado" }));
    expect(onChange).toHaveBeenCalledWith("ADVANCED");
    expect(screen.queryByRole("radio", { name: "Avançado" })).toBeNull();
  });

  it("shows the chosen label and the error", async () => {
    await render(
      <SelectField label="Nível" value="BEGINNER" options={[...options]} onChange={() => {}} error="Selecione o nível do plano." />,
    );
    expect(screen.getByRole("button", { name: "Nível: Iniciante" })).toBeOnTheScreen();
    expect(screen.getByText("Selecione o nível do plano.")).toBeOnTheScreen();
  });
});
