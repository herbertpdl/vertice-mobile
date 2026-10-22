import { fireEvent, render, screen } from "@testing-library/react-native";
import { StyleSheet } from "react-native";

import { WorkoutSetRow } from "./WorkoutSetRow";

const base = {
  number: 3,
  target: "10 reps · Direta",
  hint: "Última vez: 45 kg",
  weight: "45",
  onWeightChange: () => {},
  onToggle: () => {},
};

describe("WorkoutSetRow", () => {
  it("shows the target, hint and weight, and ticks", async () => {
    const onToggle = jest.fn();
    await render(<WorkoutSetRow {...base} done={false} onToggle={onToggle} />);
    expect(screen.getByText("10 reps · Direta")).toBeOnTheScreen();
    expect(screen.getByText("Última vez: 45 kg")).toBeOnTheScreen();
    expect(screen.getByLabelText("Carga da série 3, em quilos").props.value).toBe("45");
    const check = screen.getByRole("checkbox", { name: "Série 3 feita" });
    expect(check).not.toBeChecked();
    await fireEvent.press(check);
    expect(onToggle).toHaveBeenCalled();
  });

  it("keeps the weight editable on a done set", async () => {
    const onWeightChange = jest.fn();
    await render(<WorkoutSetRow {...base} done onWeightChange={onWeightChange} />);
    expect(screen.getByRole("checkbox")).toBeChecked();
    await fireEvent.changeText(screen.getByLabelText("Carga da série 3, em quilos"), "47,5");
    expect(onWeightChange).toHaveBeenCalledWith("47,5");
  });

  it("starts a hold on a timed set and shows the countdown while holding", async () => {
    const onHoldPress = jest.fn();
    const { rerender } = await render(
      <WorkoutSetRow {...base} target="Isometria" done={false} timed={{ holding: false, onHoldPress }} />,
    );
    await fireEvent.press(screen.getByRole("button", { name: "Iniciar a série 3" }));
    expect(onHoldPress).toHaveBeenCalled();
    await rerender(
      <WorkoutSetRow {...base} target="Isometria" done={false} timed={{ holding: true, remaining: "0:18", onHoldPress }} />,
    );
    expect(screen.getByText("0:18")).toBeOnTheScreen();
    expect(screen.getByText("0:18").props.numberOfLines).toBe(1);
    expect(screen.getByText("0:18").props.maxFontSizeMultiplier).toBe(1.3);
    expect(screen.queryByText("Isometria")).toBeNull();
    expect(screen.getByRole("button", { name: "Parar a série 3" })).toBeOnTheScreen();
  });

  it("grows with large text instead of fixing its height, and caps the weight's scaling", async () => {
    await render(<WorkoutSetRow {...base} done={false} testID="set" />);
    const style = StyleSheet.flatten(screen.getByTestId("set").props.style);
    expect(style.height).toBeUndefined();
    expect(style.minHeight).toBe(68);
    expect(screen.getByLabelText("Carga da série 3, em quilos").props.maxFontSizeMultiplier).toBe(1.3);
    expect(screen.getByText("kg").props.maxFontSizeMultiplier).toBe(1.3);
    const box = StyleSheet.flatten(screen.getByTestId("set-weight").props.style);
    expect(box.width).toBeUndefined();
    expect(box.minWidth).toBe(84);
  });
});
