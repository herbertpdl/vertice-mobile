import { fireEvent, render, screen } from "@testing-library/react-native";

import type { EditorSet } from "@/lib/workoutEditor/model";

import { SetHeader, SetRow } from "./SetRow";

const set: EditorSet = { key: "s1", id: 1, strategy: "STRAIGHT", reps: 12, weight: "42.5", restSeconds: 60 };

async function renderRow() {
  const onUpdate = jest.fn();
  const onOptions = jest.fn();
  await render(<SetRow set={set} number={2} onUpdate={onUpdate} onOptions={onOptions} />);
  return { onUpdate, onOptions };
}

describe("SetRow", () => {
  it("shows the values with their units, the load with a decimal comma", async () => {
    await renderRow();
    expect(screen.getByLabelText("Repetições da série 2")).toHaveDisplayValue("12");
    expect(screen.getByLabelText("Carga da série 2, em quilos")).toHaveDisplayValue("42,5 kg");
    expect(screen.getByLabelText("Descanso da série 2, em segundos")).toHaveDisplayValue("60 s");
  });

  it("commits complete values as they're typed, the load in wire form", async () => {
    const { onUpdate } = await renderRow();
    await fireEvent.changeText(screen.getByLabelText("Repetições da série 2"), "10");
    expect(onUpdate).toHaveBeenLastCalledWith({ reps: 10 });
    const load = screen.getByLabelText("Carga da série 2, em quilos");
    await fireEvent(load, "focus");
    await fireEvent.changeText(load, "82,");
    expect(onUpdate).not.toHaveBeenCalledWith({ weight: "82." });
    await fireEvent.changeText(load, "82,5");
    expect(onUpdate).toHaveBeenLastCalledWith({ weight: "82.5" });
    await fireEvent.changeText(screen.getByLabelText("Descanso da série 2, em segundos"), "");
    expect(onUpdate).toHaveBeenLastCalledWith({ restSeconds: undefined });
  });

  it("flags and never commits a value the platform can't store", async () => {
    const { onUpdate } = await renderRow();
    const reps = screen.getByLabelText("Repetições da série 2");
    await fireEvent.changeText(reps, "1001");
    expect(onUpdate).not.toHaveBeenCalled();
    expect(reps.props.accessibilityHint).toBe("Valor inválido");
    await fireEvent.changeText(screen.getByLabelText("Carga da série 2, em quilos"), "12345");
    expect(onUpdate).not.toHaveBeenCalled();
  });

  it("puts back the committed value when left invalid", async () => {
    await renderRow();
    const reps = screen.getByLabelText("Repetições da série 2");
    await fireEvent(reps, "focus");
    await fireEvent.changeText(reps, "1x");
    await fireEvent(reps, "blur");
    expect(reps).toHaveDisplayValue("12");
  });

  it("opens the set's actions from its number", async () => {
    const { onOptions } = await renderRow();
    await fireEvent.press(screen.getByRole("button", { name: "Opções da série 2" }));
    expect(onOptions).toHaveBeenCalled();
  });

  it("renders the column header", async () => {
    await render(<SetHeader />);
    expect(screen.getByText("CARGA (KG)", { includeHiddenElements: true })).toBeOnTheScreen();
  });
});
