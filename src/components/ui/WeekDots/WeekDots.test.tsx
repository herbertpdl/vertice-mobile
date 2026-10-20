import { render, screen } from "@testing-library/react-native";

import { WeekDots } from "./WeekDots";

describe("WeekDots", () => {
  it("reads the week as one sentence", async () => {
    await render(
      <WeekDots
        days={[
          { letter: "S", name: "Segunda", done: true },
          { letter: "T", name: "Terça", done: false },
        ]}
      />,
    );
    expect(screen.getByLabelText("Esta semana: Segunda concluído, Terça pendente")).toBeOnTheScreen();
  });
});
