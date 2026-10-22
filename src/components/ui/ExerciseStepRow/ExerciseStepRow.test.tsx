import { fireEvent, render, screen } from "@testing-library/react-native";

import { ExerciseStepRow } from "./ExerciseStepRow";

describe("ExerciseStepRow", () => {
  it("jumps to the exercise", async () => {
    const onPress = jest.fn();
    await render(<ExerciseStepRow index={2} name="Puxada frontal" meta="0 de 4 séries" state="pending" onPress={onPress} />);
    await fireEvent.press(screen.getByRole("button", { name: "Exercício 2: Puxada frontal. 0 de 4 séries" }));
    expect(onPress).toHaveBeenCalled();
  });

  it("marks the current exercise as selected and hides the index once done", async () => {
    const { rerender } = await render(
      <ExerciseStepRow index={2} name="Puxada" meta="Em andamento" state="current" onPress={() => {}} />,
    );
    expect(screen.getByRole("button").props.accessibilityState.selected).toBe(true);
    await rerender(<ExerciseStepRow index={2} name="Puxada" meta="4 de 4 séries" state="done" onPress={() => {}} />);
    expect(screen.queryByText("2")).toBeNull();
  });
});
