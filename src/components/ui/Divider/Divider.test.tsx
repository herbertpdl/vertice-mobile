import { render, screen } from "@testing-library/react-native";
import { View } from "react-native";

import { Divider } from "./Divider";

describe("Divider", () => {
  it("renders the labelled variant", async () => {
    await render(<Divider label="ou" />);
    expect(screen.getByText("ou")).toBeOnTheScreen();
  });

  it("hides the plain rule from screen readers", async () => {
    await render(
      <View testID="root">
        <Divider />
      </View>,
    );
    const rule = screen.getByTestId("root").children[0];
    expect(typeof rule !== "string" && rule.props.accessibilityElementsHidden).toBe(true);
  });
});
