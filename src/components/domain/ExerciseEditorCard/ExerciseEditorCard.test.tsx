import { fireEvent, render, screen } from "@testing-library/react-native";

import type { EditorExercise } from "@/lib/workoutEditor/model";

import { ExerciseEditorCard, type ExerciseEditorCardProps } from "./ExerciseEditorCard";

const exercise: EditorExercise = {
  key: "e1",
  id: 1,
  exercise: { id: 1, name: "Supino Reto", description: "", videoUrl: "", isStarter: true, muscleGroups: [{ id: 1, name: "Peito" }, { id: 2, name: "Tríceps" }] },
  restSecondsBetweenSets: 60,
  notes: "",
  sets: [{ key: "s1", id: 10, strategy: "STRAIGHT", reps: 12 }],
};

async function renderCard(props: Partial<ExerciseEditorCardProps> = {}) {
  const handlers = {
    onUpdateSet: jest.fn(),
    onSetOptions: jest.fn(),
    onAddSet: jest.fn(),
    onNotesChange: jest.fn(),
    onMove: jest.fn(),
    onRemove: jest.fn(),
  };
  await render(<ExerciseEditorCard exercise={exercise} {...handlers} {...props} />);
  return handlers;
}

describe("ExerciseEditorCard", () => {
  it("shows the exercise, its groups and sets, and routes every action", async () => {
    const h = await renderCard();
    expect(screen.getByText("Peito · Tríceps")).toBeOnTheScreen();
    await fireEvent.changeText(screen.getByLabelText("Repetições da série 1"), "8");
    expect(h.onUpdateSet).toHaveBeenCalledWith("s1", { reps: 8 });
    await fireEvent.press(screen.getByRole("button", { name: "Opções da série 1" }));
    expect(h.onSetOptions).toHaveBeenCalledWith("s1", 0);
    await fireEvent.press(screen.getByRole("button", { name: "Adicionar série em Supino Reto" }));
    expect(h.onAddSet).toHaveBeenCalled();
    await fireEvent.changeText(screen.getByLabelText("Observação de Supino Reto"), "Cadência");
    expect(h.onNotesChange).toHaveBeenCalledWith("Cadência");
    await fireEvent.press(screen.getByRole("button", { name: "Mover Supino Reto" }));
    expect(h.onMove).toHaveBeenCalled();
    await fireEvent.press(screen.getByRole("button", { name: "Remover Supino Reto" }));
    expect(h.onRemove).toHaveBeenCalled();
  });

  it("says when there are no sets, and stops adding at 10", async () => {
    await renderCard({ exercise: { ...exercise, sets: [] } });
    expect(screen.getByText("Nenhuma série adicionada")).toBeOnTheScreen();
    const ten = Array.from({ length: 10 }, (_, i) => ({ key: `s${i}`, id: i, strategy: "STRAIGHT" as const }));
    await renderCard({ exercise: { ...exercise, sets: ten } });
    expect(screen.queryByRole("button", { name: "Adicionar série em Supino Reto" })).toBeNull();
    expect(screen.getByText("Máximo de 10 séries por exercício.")).toBeOnTheScreen();
  });
});
