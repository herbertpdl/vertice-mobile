import { render, screen } from "@testing-library/react-native";

import { Avatar, initials } from "./Avatar";

describe("initials", () => {
  it.each([
    ["Marina Costa", "MC"],
    ["ana", "A"],
    ["  júlia   da  prado ", "JP"],
    ["Érica Ávila", "ÉÁ"],
    ["", "?"],
  ])("%j → %s", (name, expected) => {
    expect(initials(name)).toBe(expected);
  });
});

describe("Avatar", () => {
  it("renders the initials at the size's font size, hidden from screen readers", async () => {
    await render(<Avatar name="Marina Costa" size={64} />);
    const text = screen.getByText("MC", { includeHiddenElements: true });
    expect(text.props.style).toEqual(expect.arrayContaining([{ fontSize: 22 }]));
    expect(screen.queryByText("MC")).toBeNull();
  });
});
