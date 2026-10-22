import { fireEvent, render, screen } from "@testing-library/react-native";

import { WorkoutPickRow } from "./WorkoutPickRow";

const base = { day: "SEG", dayName: "Segunda", name: "Treino A", meta: "6 exercícios" };

describe("WorkoutPickRow", () => {
  it("picks the workout", async () => {
    const onPress = jest.fn();
    await render(<WorkoutPickRow {...base} state="default" onPress={onPress} />);
    await fireEvent.press(screen.getByRole("button", { name: "Segunda: Treino A. 6 exercícios" }));
    expect(onPress).toHaveBeenCalled();
  });

  it("badges a workout done this week", async () => {
    await render(<WorkoutPickRow {...base} meta="Feito esta semana" state="done" onPress={() => {}} />);
    expect(screen.getByText("Feito")).toBeOnTheScreen();
  });

  it("can't pick a workout with no exercises", async () => {
    const onPress = jest.fn();
    await render(<WorkoutPickRow {...base} meta="Sem exercícios" state="unavailable" onPress={onPress} />);
    const row = screen.getByRole("button");
    expect(row).toBeDisabled();
    await fireEvent.press(row);
    expect(onPress).not.toHaveBeenCalled();
  });

  it("says which workout is today's", async () => {
    await render(<WorkoutPickRow {...base} day="QUA" dayName="Quarta" name="Treino B" meta="7 exercícios" state="today" onPress={() => {}} />);
    expect(screen.getByRole("button", { name: "Quarta (hoje): Treino B. 7 exercícios" })).toBeOnTheScreen();
  });
});
