import { fireEvent, render, screen } from "@testing-library/react-native";
import type { ComponentProps } from "react";
import { Text } from "react-native";

import { barButton, KeyboardBar } from "./KeyboardBar";

describe("KeyboardBar", () => {
  it("offers a way to close the keyboard, in Portuguese", async () => {
    await render(<KeyboardBar />);
    // The library's Jest mock renders "Done" as a bare element carrying its props.
    expect(JSON.stringify(screen.toJSON())).toContain('"text":"Concluir"');
  });
});

describe("barButton", () => {
  type Props = ComponentProps<ReturnType<typeof barButton>>;
  const props = (over: Partial<Props> = {}) => ({ onPress: jest.fn(), testID: "x", ...over }) as unknown as Props;

  it("reads its label and hint in Portuguese, and presses", async () => {
    const Button = barButton("Concluir", "Fecha o teclado");
    const onPress = jest.fn();
    await render(
      <Button {...props({ onPress })}>
        <Text>Concluir</Text>
      </Button>,
    );
    const button = screen.getByRole("button", { name: "Concluir" });
    expect(button.props.accessibilityHint).toBe("Fecha o teclado");
    await fireEvent.press(button);
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it("can't be pressed while disabled, and says so", async () => {
    const Button = barButton("Próximo campo", "Vai para o próximo campo");
    const onPress = jest.fn();
    await render(<Button {...props({ onPress, disabled: true })} />);
    const button = screen.getByRole("button", { name: "Próximo campo" });
    expect(button).toBeDisabled();
    await fireEvent.press(button);
    expect(onPress).not.toHaveBeenCalled();
  });

  it("takes a larger touch area", async () => {
    const slop = { top: 12, bottom: 12, left: 12, right: 12 };
    const Button = barButton("Concluir", "Fecha o teclado", slop);
    await render(<Button {...props()} />);
    expect(screen.getByRole("button", { name: "Concluir" }).props.hitSlop).toEqual(slop);
  });
});
