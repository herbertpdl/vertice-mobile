import { fireEvent, render, screen } from "@testing-library/react-native";
import { Plus } from "lucide-react-native";
import { StyleSheet } from "react-native";

import { colors } from "@/theme";

import { IconButton } from "./IconButton";

describe("IconButton", () => {
  it("is a 44 pt labelled button", async () => {
    const onPress = jest.fn();
    await render(<IconButton icon={Plus} accessibilityLabel="Novo aluno" onPress={onPress} />);
    const button = screen.getByRole("button", { name: "Novo aluno" });
    await fireEvent.press(button);
    expect(onPress).toHaveBeenCalled();
    expect(StyleSheet.flatten(button.props.style)).toMatchObject({
      width: 44,
      height: 44,
      backgroundColor: colors.primary,
    });
  });

  it("plain has no fill and a disabled one doesn't press", async () => {
    const onPress = jest.fn();
    await render(<IconButton icon={Plus} accessibilityLabel="Voltar" variant="plain" disabled onPress={onPress} />);
    const button = screen.getByRole("button", { name: "Voltar" });
    await fireEvent.press(button);
    expect(onPress).not.toHaveBeenCalled();
    expect(StyleSheet.flatten(button.props.style).backgroundColor).toBe("transparent");
  });
});
