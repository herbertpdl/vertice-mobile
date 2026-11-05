import { act, fireEvent, render, screen } from "@testing-library/react-native";
import * as Haptics from "expo-haptics";
import { BackHandler } from "react-native";
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

  it("still shows and finishes under Reduce Motion", async () => {
    jest.mocked(useReducedMotion).mockReturnValue(true);
    const onDone = jest.fn();
    await render(<ExerciseDoneCheck announcement="Exercício concluído." onDone={onDone} />);
    expect(screen.getByTestId("exercise-done-check")).toBeOnTheScreen();
    await act(async () => {
      jest.advanceTimersByTime(EXERCISE_DONE_MS);
    });
    expect(onDone).toHaveBeenCalledTimes(1);
    jest.mocked(useReducedMotion).mockReturnValue(false);
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

  it("treats the back button as moving on, once", async () => {
    const onDone = jest.fn();
    const add = jest.spyOn(BackHandler, "addEventListener");
    await render(<WorkoutCelebration onDone={onDone} />);
    const handler = add.mock.calls.at(-1)?.[1];
    expect(handler?.({} as Parameters<typeof handler>[0])).toBe(true);
    expect(onDone).toHaveBeenCalledTimes(1);
    add.mockRestore();
  });

  it("has sparks, and none under Reduce Motion, where it's shorter", async () => {
    await render(<WorkoutCelebration onDone={jest.fn()} />);
    expect(screen.getAllByTestId("celebration-spark").length).toBeGreaterThan(0);
    await screen.unmount();

    jest.mocked(useReducedMotion).mockReturnValue(true);
    const onDone = jest.fn();
    await render(<WorkoutCelebration onDone={onDone} />);
    expect(screen.queryByTestId("celebration-spark")).toBeNull();
    await act(async () => {
      jest.advanceTimersByTime(CELEBRATION_REDUCED_MS);
    });
    expect(onDone).toHaveBeenCalledTimes(1);
    jest.mocked(useReducedMotion).mockReturnValue(false);
  });
});
