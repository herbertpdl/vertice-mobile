import { fireEvent, render, screen } from "@testing-library/react-native";

import { Banner, StatusBanner } from "./Banner";

describe("Banner", () => {
  it("is an alert for errors", async () => {
    await render(<Banner message="Não foi possível entrar." />);
    expect(screen.getByRole("alert", { name: "Não foi possível entrar." })).toBeOnTheScreen();
  });

  it("is not an alert for info", async () => {
    await render(<Banner tone="info" message="Exercício padrão." />);
    expect(screen.queryByRole("alert")).toBeNull();
  });
});

describe("StatusBanner", () => {
  it("offline has the design's default copy and a retry", async () => {
    const onPress = jest.fn();
    await render(<StatusBanner kind="offline" action={{ label: "Tentar", onPress }} />);
    expect(screen.getByText("Sem conexão com a internet.")).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole("button", { name: "Tentar" }));
    expect(onPress).toHaveBeenCalled();
  });
});
