import { fireEvent, render, screen } from "@testing-library/react-native";

import { Text } from "../Text";

import { InlineLink, TextLink } from "./TextLink";

describe("TextLink", () => {
  it("presses with the given role", async () => {
    const onPress = jest.fn();
    await render(<TextLink label="Ver todos" onPress={onPress} />);
    await fireEvent.press(screen.getByRole("button", { name: "Ver todos" }));
    expect(onPress).toHaveBeenCalled();
  });
});

describe("InlineLink", () => {
  it("is a link inside running text", async () => {
    const onPress = jest.fn();
    await render(
      <Text>
        Li e aceito os <InlineLink label="termos de uso" onPress={onPress} />.
      </Text>,
    );
    await fireEvent.press(screen.getByRole("link", { name: "termos de uso" }));
    expect(onPress).toHaveBeenCalled();
  });
});
