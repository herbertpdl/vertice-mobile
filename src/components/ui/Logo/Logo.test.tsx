import { render, screen } from "@testing-library/react-native";

import { Logo } from "./Logo";

describe("Logo", () => {
  it("is one image read as the brand name, with the wordmark", async () => {
    await render(<Logo />);
    expect(screen.getByRole("image", { name: "Vertice" })).toBeOnTheScreen();
    expect(screen.getByText("VERTICE", { includeHiddenElements: true })).toBeOnTheScreen();
  });

  it("uses the large wordmark when stacked", async () => {
    await render(<Logo layout="stacked" />);
    const wordmark = screen.getByText("VERTICE", { includeHiddenElements: true });
    expect(wordmark.props.style).toEqual(expect.arrayContaining([expect.objectContaining({ fontSize: 24, letterSpacing: 7 })]));
  });
});
