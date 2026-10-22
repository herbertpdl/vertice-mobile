import { render, screen } from "@testing-library/react-native";

import { RestTimer } from "./RestTimer";

describe("RestTimer", () => {
  it("reads the time left and what comes next, with no controls", async () => {
    await render(<RestTimer remaining="0:47" progress={0.2} caption="Próxima: série 3 · 12 reps" />);
    expect(screen.getByLabelText("Descanso: 0:47. Próxima: série 3 · 12 reps")).toBeOnTheScreen();
    expect(screen.queryAllByRole("button")).toHaveLength(0);
  });
});
