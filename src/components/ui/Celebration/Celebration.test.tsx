import { act, fireEvent, render, screen } from "@testing-library/react-native";
import * as Haptics from "expo-haptics";
import { useReducedMotion } from "react-native-reanimated";

import { CELEBRATION_MS, CELEBRATION_REDUCED_MS, EXERCISE_DONE_MS, ExerciseDoneCheck, WorkoutCelebration } from ".";

beforeEach(() => jest.useFakeTimers());
afterEach(() => jest.useRealTimers());

describe("ExerciseDoneCheck", () => {
  it("reads its announcement and finishes by itself", async () => {
    const onDone = jest.fn();
    await render(<ExerciseDoneCheck announcement="Exercício concluído." onDone={onDone} />);
    expect(screen.getByLabelText("Exercício concluído.")).toBeOnTheScreen();
    await act(async () => {
      jest.advanceTimersByTime(EXERCISE_DONE_MS - 1);
    });
    expect(onDone).not.toHaveBeenCalled();
    await act(async () => {
      jest.advanceTimersByTime(1);
    });
    expect(onDone).toHaveBeenCalledTimes(1);
  });

  it("never takes a touch", async () => {
    await render(<ExerciseDoneCheck announcement="Exercício concluído." onDone={jest.fn()} />);
    expect(screen.getByLabelText("Exercício concluído.").props.pointerEvents).toBe("none");
  });
});

describe("WorkoutCelebration", () => {
  it("plays with a success haptic and moves on by itself", async () => {
    const onDone = jest.fn();
    await render(<WorkoutCelebration onDone={onDone} />);
    expect(screen.getByText("Treino concluído!")).toBeOnTheScreen();
    expect(Haptics.notificationAsync).toHaveBeenCalledTimes(1);
    await act(async () => {
      jest.advanceTimersByTime(CELEBRATION_MS);
    });
    expect(onDone).toHaveBeenCalledTimes(1);
  });

  it("can be skipped with a tap", async () => {
    const onDone = jest.fn();
    await render(<WorkoutCelebration onDone={onDone} />);
    await fireEvent.press(screen.getByRole("button", { name: "Treino concluído! Continuar" }));
    expect(onDone).toHaveBeenCalledTimes(1);
  });

  it("is shorter under Reduce Motion", async () => {
    jest.mocked(useReducedMotion).mockReturnValue(true);
    const onDone = jest.fn();
    await render(<WorkoutCelebration onDone={onDone} />);
    await act(async () => {
      jest.advanceTimersByTime(CELEBRATION_REDUCED_MS);
    });
    expect(onDone).toHaveBeenCalledTimes(1);
    jest.mocked(useReducedMotion).mockReturnValue(false);
  });
});
