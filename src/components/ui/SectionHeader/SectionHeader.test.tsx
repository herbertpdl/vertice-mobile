import { fireEvent, render, screen } from "@testing-library/react-native";

import { SectionHeader } from "./SectionHeader";

describe("SectionHeader", () => {
  it("is a header with an optional link", async () => {
    const onPress = jest.fn();
    await render(<SectionHeader title="Feedbacks recentes" action={{ label: "Ver todos", onPress }} />);
    expect(screen.getByRole("header", { name: "Feedbacks recentes" })).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole("button", { name: "Ver todos" }));
    expect(onPress).toHaveBeenCalled();
  });
});
