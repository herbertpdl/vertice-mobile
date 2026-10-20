import { fireEvent, render, screen } from "@testing-library/react-native";
import { EllipsisVertical } from "lucide-react-native";

import { NavBar } from "./NavBar";

describe("NavBar", () => {
  it("has a header title, a back button and an action", async () => {
    const onBack = jest.fn();
    const onAction = jest.fn();
    await render(
      <NavBar
        title="Aluno"
        onBack={onBack}
        action={{ icon: EllipsisVertical, accessibilityLabel: "Mais ações", onPress: onAction }}
      />,
    );
    expect(screen.getByRole("header", { name: "Aluno" })).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole("button", { name: "Voltar" }));
    await fireEvent.press(screen.getByRole("button", { name: "Mais ações" }));
    expect(onBack).toHaveBeenCalled();
    expect(onAction).toHaveBeenCalled();
  });

  it("can have no way back", async () => {
    await render(<NavBar title="Termos" onBack={null} />);
    expect(screen.queryByRole("button", { name: "Voltar" })).toBeNull();
  });
});
