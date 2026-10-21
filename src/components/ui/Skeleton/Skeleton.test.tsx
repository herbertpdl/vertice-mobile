import { render, screen } from "@testing-library/react-native";
import { View } from "react-native";

import { Skeleton } from "./Skeleton";

describe("Skeleton", () => {
  it("renders the three shapes, hidden from screen readers", async () => {
    await render(
      <View testID="root">
        <Skeleton.Line />
        <Skeleton.Circle size={40} />
        <Skeleton.Block width="100%" height={140} />
      </View>,
    );
    const shapes = screen.getByTestId("root").children;
    expect(shapes).toHaveLength(3);
    for (const shape of shapes) {
      if (typeof shape !== "string") expect(shape.props.accessibilityElementsHidden).toBe(true);
    }
  });
});
