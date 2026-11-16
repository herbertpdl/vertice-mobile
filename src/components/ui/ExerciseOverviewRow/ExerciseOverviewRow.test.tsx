import { fireEvent, render, screen } from "@testing-library/react-native";

import { ExerciseOverviewRow, type ExerciseOverviewRowProps } from "./ExerciseOverviewRow";

const base: ExerciseOverviewRowProps = {
  position: 2,
  name: "Puxada frontal",
  setsText: "4 séries · 10–12 reps",
  thumbnail: null,
  hasVideo: false,
  muscleGroups: ["Costas", "Ombros"],
  onPress: () => {},
};

describe("ExerciseOverviewRow", () => {
  it("opens the exercise, named with its position, sets and groups", async () => {
    const onPress = jest.fn();
    await render(<ExerciseOverviewRow {...base} onPress={onPress} />);
    expect(screen.getByText("EXERCÍCIO 2")).toBeTruthy();
    expect(screen.getByText("Costas")).toBeTruthy();
    expect(screen.getByText("Ombros")).toBeTruthy();
    await fireEvent.press(screen.getByRole("button", { name: "Exercício 2: Puxada frontal. 4 séries · 10–12 reps" }));
    expect(onPress).toHaveBeenCalled();
  });

  it("shows no count without a session", async () => {
    await render(<ExerciseOverviewRow {...base} />);
    expect(screen.queryByText(/ de /)).toBeNull();
  });

  it("shows the sets done, rings the current exercise and marks a done one", async () => {
    const { rerender } = await render(<ExerciseOverviewRow {...base} progress={{ done: 2, total: 4, current: true }} />);
    expect(screen.getByText("2 de 4")).toBeTruthy();
    expect(screen.getByRole("button").props.accessibilityState.selected).toBe(true);
    await rerender(<ExerciseOverviewRow {...base} progress={{ done: 4, total: 4, current: true }} />);
    expect(screen.getByRole("button", { name: /4 de 4 séries, concluído/ })).toBeTruthy();
    expect(screen.getByRole("button").props.accessibilityState.selected).toBe(false);
  });
});
