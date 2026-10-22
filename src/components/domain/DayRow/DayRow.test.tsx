import { fireEvent, render, screen } from "@testing-library/react-native";

import { DayRow } from "./DayRow";

const workout = (id: number, name: string) => ({ id, name, trainingPlanId: 1, dayOfWeek: "MONDAY" as const });

describe("DayRow", () => {
  it("lists every workout of a training day and opens the tapped one", async () => {
    const onOpen = jest.fn();
    await render(<DayRow day="MONDAY" workouts={[workout(1, "Treino A"), workout(2, "Cardio")]} onOpenWorkout={onOpen} onAddWorkout={() => {}} />);
    await fireEvent.press(screen.getByRole("button", { name: "Segunda: Cardio" }));
    expect(onOpen).toHaveBeenCalledWith(expect.objectContaining({ id: 2 }));
    expect(screen.queryByText("Descanso")).toBeNull();
  });

  it("offers to add a workout on a rest day", async () => {
    const onAdd = jest.fn();
    await render(<DayRow day="SUNDAY" workouts={[]} onOpenWorkout={() => {}} onAddWorkout={onAdd} />);
    await fireEvent.press(screen.getByRole("button", { name: "Domingo: descanso. Adicionar treino" }));
    expect(onAdd).toHaveBeenCalled();
  });

  it("is just a rest day when it can't add a workout (the client's read-only plan)", async () => {
    await render(<DayRow day="SUNDAY" workouts={[]} onOpenWorkout={() => {}} />);
    expect(screen.getByLabelText("Domingo: descanso")).toBeOnTheScreen();
    expect(screen.queryByRole("button")).toBeNull();
    expect(screen.queryByText("Adicionar treino")).toBeNull();
  });
});
