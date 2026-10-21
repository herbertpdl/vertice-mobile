import { fireEvent, render, screen } from "@testing-library/react-native";

import type { Exercise } from "@/lib/api/types";

import { ExerciseCard } from "./ExerciseCard";

const exercise: Exercise = {
  id: 1,
  name: "Supino Reto",
  description: "",
  videoUrl: "https://youtu.be/dQw4w9WgXcQ",
  isStarter: true,
  muscleGroups: [{ id: 1, name: "Peito" }],
};

describe("ExerciseCard", () => {
  it("is a button with the groups and the Padrão badge in the catalog", async () => {
    const onPress = jest.fn();
    await render(<ExerciseCard exercise={exercise} onPress={onPress} />);
    expect(screen.getByText("Peito")).toBeOnTheScreen();
    expect(screen.getByText("Padrão")).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole("button", { name: "Supino Reto" }));
    expect(onPress).toHaveBeenCalled();
  });

  it("is a checkbox when picking", async () => {
    await render(<ExerciseCard exercise={{ ...exercise, isStarter: false }} selected onPress={() => {}} />);
    expect(screen.getByRole("checkbox", { name: "Supino Reto" })).toBeChecked();
    expect(screen.queryByText("Padrão")).toBeNull();
  });
});
