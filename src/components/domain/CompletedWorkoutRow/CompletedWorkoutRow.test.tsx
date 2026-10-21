import { render, screen } from "@testing-library/react-native";

import { CompletedWorkoutRow } from "./CompletedWorkoutRow";

describe("CompletedWorkoutRow", () => {
  it("shows when it was completed in São Paulo, from completedAt", async () => {
    await render(
      <CompletedWorkoutRow item={{ student: "Camila Souza", workout: "Treino B", time: "21:10", completedAt: "2026-10-21T21:10:00Z" }} />,
    );
    expect(screen.getByLabelText("Camila Souza concluiu Treino B às 18:10")).toBeOnTheScreen();
  });
});
