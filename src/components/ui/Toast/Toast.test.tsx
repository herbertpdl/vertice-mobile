import { act, fireEvent, render, screen } from "@testing-library/react-native";
import { Pressable } from "react-native";

import { Text } from "../Text";

import { TOAST_DURATION_MS, ToastProvider, useToast } from "./Toast";

function Trigger() {
  const toast = useToast();
  return (
    <Pressable accessibilityRole="button" onPress={() => toast.show("Treino salvo.")}>
      <Text>Mostrar</Text>
    </Pressable>
  );
}

describe("Toast", () => {
  afterEach(() => jest.useRealTimers());

  it("shows a message and hides it after the duration", async () => {
    jest.useFakeTimers();
    await render(
      <ToastProvider>
        <Trigger />
      </ToastProvider>,
    );
    await fireEvent.press(screen.getByRole("button"));
    expect(screen.getByLabelText("Treino salvo.")).toBeOnTheScreen();
    await act(async () => {
      jest.advanceTimersByTime(TOAST_DURATION_MS);
    });
    expect(screen.queryByLabelText("Treino salvo.")).toBeNull();
  });

  it("throws outside the provider", async () => {
    jest.spyOn(console, "error").mockImplementation(() => {});
    await expect(render(<Trigger />)).rejects.toThrow(/ToastProvider/);
  });
});
