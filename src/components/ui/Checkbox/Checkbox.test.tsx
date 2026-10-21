import { fireEvent, render, screen } from "@testing-library/react-native";
import { StyleSheet } from "react-native";

import { colors } from "@/theme";

import { Text } from "../Text";

import { Checkbox } from "./Checkbox";

describe("Checkbox", () => {
  it("toggles from the box and from a string label", async () => {
    const onChange = jest.fn();
    await render(<Checkbox checked={false} onChange={onChange} label="Peito" />);
    const box = screen.getByRole("checkbox", { name: "Peito" });
    expect(box).not.toBeChecked();
    await fireEvent.press(box);
    await fireEvent.press(screen.getByText("Peito"));
    expect(onChange).toHaveBeenNthCalledWith(1, true);
    expect(onChange).toHaveBeenNthCalledWith(2, true);
  });

  it("is a 44 pt target around the 24 pt box", async () => {
    await render(<Checkbox checked={false} onChange={() => {}} label="Peito" />);
    expect(StyleSheet.flatten(screen.getByRole("checkbox").props.style)).toMatchObject({
      width: 44,
      height: 44,
      margin: -10,
    });
  });

  it("shows the error as text, hint and a danger ring", async () => {
    await render(<Checkbox checked={false} onChange={() => {}} label="Termos" error="Aceite os termos" />);
    const box = screen.getByRole("checkbox", { name: "Termos" });
    expect(screen.getByText("Aceite os termos")).toBeOnTheScreen();
    expect(box.props.accessibilityHint).toBe("Aceite os termos");
    expect(StyleSheet.flatten(box.children[0] && typeof box.children[0] !== "string" ? box.children[0].props.style : {})).toMatchObject({
      borderColor: colors.danger,
    });
  });

  it("doesn't toggle when disabled, from the box or the label", async () => {
    const onChange = jest.fn();
    await render(<Checkbox checked onChange={onChange} label="Termos" disabled />);
    await fireEvent.press(screen.getByRole("checkbox", { name: "Termos" }));
    await fireEvent.press(screen.getByText("Termos"));
    expect(onChange).not.toHaveBeenCalled();
  });

  it("takes the spoken label for rich content", async () => {
    await render(
      <Checkbox
        checked={false}
        onChange={() => {}}
        accessibilityLabel="Aceito os termos"
        label={<Text>Aceito os termos</Text>}
      />,
    );
    expect(screen.getByRole("checkbox", { name: "Aceito os termos" })).toBeOnTheScreen();
  });
});
