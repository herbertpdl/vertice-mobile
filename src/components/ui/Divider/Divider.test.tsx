import { render, screen } from "@testing-library/react-native";

import { Divider } from "./Divider";

describe("Divider", () => {
  it("renders the labelled variant", async () => {
    await render(<Divider label="ou" />);
    expect(screen.getByText("ou")).toBeOnTheScreen();
  });
});
