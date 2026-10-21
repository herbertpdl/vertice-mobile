import { render, screen } from "@testing-library/react-native";
import { useReducedMotion } from "react-native-reanimated";

import { Spinner } from "./Spinner";

describe("Spinner", () => {
  it("is announced only when labelled", async () => {
    const { rerender } = await render(<Spinner />);
    expect(screen.queryByRole("progressbar")).toBeNull();
    await rerender(<Spinner accessibilityLabel="Carregando" />);
    expect(screen.getByRole("progressbar", { name: "Carregando" })).toBeOnTheScreen();
  });

  it("renders without animating under reduce motion", async () => {
    jest.mocked(useReducedMotion).mockReturnValueOnce(true);
    await render(<Spinner accessibilityLabel="Carregando" />);
    expect(screen.getByRole("progressbar")).toBeOnTheScreen();
  });
});
