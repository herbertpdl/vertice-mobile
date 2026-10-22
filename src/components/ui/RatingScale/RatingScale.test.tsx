import { fireEvent, render, screen } from "@testing-library/react-native";
import { StyleSheet } from "react-native";

import { RatingScale } from "./RatingScale";

describe("RatingScale", () => {
  it("offers the five ratings, hardest first, as radios", async () => {
    await render(<RatingScale value={null} onChange={() => {}} />);
    const radios = screen.getAllByRole("radio");
    expect(radios.map((r) => r.props.accessibilityLabel)).toEqual([
      "Muito difícil",
      "Difícil",
      "Na medida",
      "Fácil",
      "Muito fácil",
    ]);
    expect(radios.every((r) => r.props.accessibilityState.checked === false)).toBe(true);
  });

  it("marks the selected rating and reports a new pick", async () => {
    const onChange = jest.fn();
    await render(<RatingScale value="HARD" onChange={onChange} />);
    expect(screen.getByRole("radio", { name: "Difícil" })).toBeChecked();
    await fireEvent.press(screen.getByRole("radio", { name: "Fácil" }));
    expect(onChange).toHaveBeenCalledWith("EASY");
  });

  it("lets the options share the row instead of fixing their width (fits 320 pt)", async () => {
    await render(<RatingScale value={null} onChange={() => {}} />);
    for (const radio of screen.getAllByRole("radio")) {
      const style = StyleSheet.flatten(radio.props.style);
      expect(style.width).toBeUndefined();
      expect(style).toMatchObject({ flex: 1, maxWidth: 68 });
    }
    // "Muito difícil" wraps instead of truncating on narrow screens.
    expect(screen.getByText("Muito difícil").props.numberOfLines).toBe(2);
  });
});
