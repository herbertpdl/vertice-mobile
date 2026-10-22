import { fireEvent, render, screen } from "@testing-library/react-native";

import { pickRow, WorkoutPickerSheet } from "./WorkoutPickerSheet";

const w = (id: number, dayOfWeek: "MONDAY" | "WEDNESDAY" | "FRIDAY", name: string) => ({ id, name, trainingPlanId: 1, dayOfWeek });

describe("pickRow", () => {
  it("is unavailable without exercises, done when finished, today on today's day", () => {
    const finished = new Set([1]);
    expect(pickRow(w(2, "MONDAY", "A"), 0, finished, "WEDNESDAY")).toEqual({ state: "unavailable", meta: "Sem exercícios" });
    expect(pickRow(w(1, "MONDAY", "A"), 5, finished, "WEDNESDAY")).toEqual({ state: "done", meta: "Feito esta semana" });
    expect(pickRow(w(3, "WEDNESDAY", "B"), 1, finished, "WEDNESDAY")).toEqual({ state: "today", meta: "1 exercício" });
    expect(pickRow(w(4, "FRIDAY", "C"), 6, finished, "WEDNESDAY")).toEqual({ state: "default", meta: "6 exercícios" });
  });
});

describe("WorkoutPickerSheet", () => {
  it("lists the workouts Monday first with the notice, and picks one", async () => {
    const onPick = jest.fn();
    await render(
      <WorkoutPickerSheet
        visible
        onClose={() => {}}
        workouts={[w(3, "FRIDAY", "Treino C"), w(1, "MONDAY", "Treino A")]}
        exerciseCounts={new Map([[1, 5], [3, 6]])}
        finished={new Set()}
        today="WEDNESDAY"
        notice="Hoje não tem treino."
        onPick={onPick}
      />,
    );
    expect(screen.getByText("Hoje não tem treino.")).toBeOnTheScreen();
    const rows = screen.getAllByRole("button").filter((b) => /Treino/.test(b.props.accessibilityLabel ?? ""));
    expect(rows.map((r) => r.props.accessibilityLabel)).toEqual(["Segunda: Treino A. 5 exercícios", "Sexta: Treino C. 6 exercícios"]);
    await fireEvent.press(rows[1]);
    expect(onPick).toHaveBeenCalledWith(expect.objectContaining({ id: 3 }));
  });
});
