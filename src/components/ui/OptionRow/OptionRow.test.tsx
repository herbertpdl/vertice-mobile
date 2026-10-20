import { fireEvent, render, screen } from "@testing-library/react-native";

import { OptionRow } from "./OptionRow";

describe("OptionRow", () => {
  it("single: a checked radio", async () => {
    const onPress = jest.fn();
    await render(<OptionRow label="Segunda-feira" selected onPress={onPress} />);
    const row = screen.getByRole("radio", { name: "Segunda-feira" });
    expect(row).toBeChecked();
    await fireEvent.press(row);
    expect(onPress).toHaveBeenCalled();
  });

  it("multiple: a checkbox", async () => {
    await render(<OptionRow label="Peito" selected={false} mode="multiple" onPress={() => {}} />);
    expect(screen.getByRole("checkbox", { name: "Peito" })).not.toBeChecked();
  });
});
