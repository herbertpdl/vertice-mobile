import { fireEvent, render, screen } from "@testing-library/react-native";
import { SearchX } from "lucide-react-native";

import { EmptyState, ErrorState } from "./EmptyState";

describe("EmptyState", () => {
  it("shows title, message and action", async () => {
    const onPress = jest.fn();
    await render(
      <EmptyState icon={SearchX} title="Nenhum aluno encontrado" message="Tente outro termo." action={{ label: "Limpar busca", onPress }} />,
    );
    expect(screen.getByRole("header", { name: "Nenhum aluno encontrado" })).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole("button", { name: "Limpar busca" }));
    expect(onPress).toHaveBeenCalled();
  });
});

describe("ErrorState", () => {
  it("defaults to the design's copy and retries", async () => {
    const onRetry = jest.fn();
    await render(<ErrorState onRetry={onRetry} />);
    expect(screen.getByText("Algo deu errado")).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole("button", { name: "Tentar novamente" }));
    expect(onRetry).toHaveBeenCalled();
  });
});
