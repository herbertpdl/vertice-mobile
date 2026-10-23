import { fireEvent, render, screen } from "@testing-library/react-native";

import { ExerciseListSheet, stepMeta } from "./ExerciseListSheet";

describe("stepMeta", () => {
  it("counts the sets, and says which exercise is under way", () => {
    expect(stepMeta({ index: 0, name: "Remada", done: 4, total: 4, state: "done" })).toBe("4 de 4 séries");
    expect(stepMeta({ index: 1, name: "Supino", done: 2, total: 4, state: "current" })).toBe("Em andamento · 2 de 4 séries");
    expect(stepMeta({ index: 2, name: "Prancha", done: 0, total: 1, state: "pending" })).toBe("0 de 1 série");
  });
});

describe("ExerciseListSheet", () => {
  it("opens any exercise and finishes at any time (R41, R42)", async () => {
    const onPick = jest.fn();
    const onFinish = jest.fn();
    await render(
      <ExerciseListSheet
        visible
        onClose={() => {}}
        steps={[
          { index: 0, name: "Remada", done: 2, total: 2, state: "done" },
          { index: 1, name: "Prancha", done: 0, total: 1, state: "current" },
        ]}
        onPick={onPick}
        onFinish={onFinish}
      />,
    );
    await fireEvent.press(screen.getByText("Prancha"));
    expect(onPick).toHaveBeenCalledWith(1);
    await fireEvent.press(screen.getByRole("button", { name: "Finalizar treino" }));
    expect(onFinish).toHaveBeenCalled();
  });
});
