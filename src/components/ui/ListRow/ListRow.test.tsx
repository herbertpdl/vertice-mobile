import { fireEvent, render, screen } from "@testing-library/react-native";
import { StyleSheet } from "react-native";
import { LogOut, Trash2 } from "lucide-react-native";

import { colors } from "@/theme";

import { ListRow } from "./ListRow";

describe("ListRow", () => {
  it("presses", async () => {
    const onPress = jest.fn();
    await render(<ListRow icon={LogOut} label="Sair" onPress={onPress} />);
    await fireEvent.press(screen.getByRole("button", { name: "Sair" }));
    expect(onPress).toHaveBeenCalled();
  });

  it("danger rows are labelled in danger", async () => {
    await render(<ListRow icon={Trash2} label="Excluir conta" danger onPress={() => {}} />);
    expect(StyleSheet.flatten(screen.getByText("Excluir conta").props.style).color).toBe(colors.danger);
  });
});
