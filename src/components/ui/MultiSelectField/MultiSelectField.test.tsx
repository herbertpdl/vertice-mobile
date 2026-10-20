import { fireEvent, render, screen } from "@testing-library/react-native";

import { MultiSelectField } from "./MultiSelectField";

const options = [
  { value: 1, label: "Peito" },
  { value: 2, label: "Costas" },
];

describe("MultiSelectField", () => {
  it("edits a draft and commits it on Aplicar", async () => {
    const onChange = jest.fn();
    await render(
      <MultiSelectField label="Grupos musculares" values={[1]} options={options} onChange={onChange} minSelected={1} />,
    );
    await fireEvent.press(screen.getByRole("button", { name: "Grupos musculares: Peito" }));
    await fireEvent.press(screen.getByRole("checkbox", { name: "Costas" }));
    await fireEvent.press(screen.getByRole("button", { name: "Aplicar (2)" }));
    expect(onChange).toHaveBeenCalledWith([1, 2]);
  });

  it("can't apply fewer than the minimum", async () => {
    const onChange = jest.fn();
    await render(
      <MultiSelectField label="Grupos" values={[1]} options={options} onChange={onChange} minSelected={1} />,
    );
    await fireEvent.press(screen.getByRole("button", { name: "Grupos: Peito" }));
    await fireEvent.press(screen.getByRole("checkbox", { name: "Peito" }));
    expect(screen.getByRole("button", { name: "Aplicar (0)" })).toBeDisabled();
  });
});
