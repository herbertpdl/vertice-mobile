import { fireEvent, render, screen } from "@testing-library/react-native";

import { Checkbox } from "./Checkbox";

describe("Checkbox", () => {
  it("toggles from the box and from a string label", async () => {
    const onChange = jest.fn();
    await render(<Checkbox checked={false} onChange={onChange} label="Peito" />);
    const box = screen.getByRole("checkbox", { name: "Peito" });
    expect(box).not.toBeChecked();
    await fireEvent.press(box);
    await fireEvent.press(screen.getByText("Peito"));
    expect(onChange).toHaveBeenNthCalledWith(1, true);
    expect(onChange).toHaveBeenNthCalledWith(2, true);
  });

  it("shows the error and doesn't toggle when disabled", async () => {
    const onChange = jest.fn();
    await render(
      <Checkbox checked onChange={onChange} label="Termos" disabled error="Aceite os termos" />,
    );
    await fireEvent.press(screen.getByRole("checkbox", { name: "Termos" }));
    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByText("Aceite os termos")).toBeOnTheScreen();
  });
});
