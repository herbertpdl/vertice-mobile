import { fireEvent, render, screen } from "@testing-library/react-native";

import { DateField } from "./DateField";

describe("DateField", () => {
  it("shows the business date in pt-BR and picks a day in the calendar sheet", async () => {
    const onChange = jest.fn();
    await render(<DateField label="Início" value="2026-10-24" onChange={onChange} />);
    await fireEvent.press(screen.getByRole("button", { name: "Início: 24/10/2026" }));
    expect(screen.getByText("Outubro 2026")).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole("button", { name: /^Sexta-feira, 30 de out de 2026|^Sexta, 30 de out de 2026/ }));
    expect(onChange).toHaveBeenCalledWith("2026-10-30");
  });

  it("pages months and refuses days outside the bounds", async () => {
    const onChange = jest.fn();
    await render(<DateField label="Término" value="2026-10-24" min="2026-10-20" onChange={onChange} />);
    await fireEvent.press(screen.getByRole("button", { name: "Término: 24/10/2026" }));
    expect(screen.getByRole("button", { name: /19 de out de 2026/ })).toBeDisabled();
    await fireEvent.press(screen.getByRole("button", { name: "Próximo mês" }));
    expect(screen.getByText("Novembro 2026")).toBeOnTheScreen();
  });
});
