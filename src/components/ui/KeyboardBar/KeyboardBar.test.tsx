import { render, screen } from "@testing-library/react-native";

import { KeyboardBar } from "./KeyboardBar";

describe("KeyboardBar", () => {
  it("offers a way to close the keyboard, in Portuguese", async () => {
    await render(<KeyboardBar />);
    // The library's Jest mock renders "Done" as a bare element carrying its props.
    expect(JSON.stringify(screen.toJSON())).toContain('"text":"Concluir"');
  });
});
