import { render, screen } from "@testing-library/react-native";

import { TextArea } from "./TextArea";

describe("TextArea", () => {
  it("counts characters against maxLength", async () => {
    await render(<TextArea label="Descrição" value="Remada" maxLength={2000} onChangeText={() => {}} />);
    expect(screen.getByText("6 / 2000")).toBeOnTheScreen();
    expect(screen.getByLabelText("Descrição").props.maxLength).toBe(2000);
    expect(screen.getByLabelText("Descrição").props.multiline).toBe(true);
  });

  it("has no counter without maxLength, and shows errors", async () => {
    await render(<TextArea label="Notas" value="" error="Obrigatório" onChangeText={() => {}} />);
    expect(screen.queryByText(/\/ /)).toBeNull();
    expect(screen.getByText("Obrigatório")).toBeOnTheScreen();
  });
});
