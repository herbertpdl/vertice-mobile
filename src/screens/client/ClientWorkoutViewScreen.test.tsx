import { screen } from "@testing-library/react-native";

import { mockBff, type BffMock } from "@/test/bff";
import { renderScreen } from "@/test/render";

import { ClientWorkoutViewScreen } from "./ClientWorkoutViewScreen";
import { full, workout } from "./fixtures";

jest.mock("expo-router", () => ({
  router: { back: jest.fn(), canGoBack: () => true, replace: jest.fn() },
  useLocalSearchParams: () => ({ id: "11" }),
}));

let bff: BffMock;
afterEach(() => bff?.restore());

describe("ClientWorkoutViewScreen", () => {
  it("lists the exercises and their sets as prescribed, with no way to train or edit", async () => {
    const tree = full(workout(11, "MONDAY", "Treino A"), 2, 2);
    tree.exercises[0].sets[0].weight = "40.5";
    bff = mockBff({ "GET /api/workouts/11/full": tree });
    await renderScreen(<ClientWorkoutViewScreen />);
    expect(await screen.findByRole("header", { name: "Treino A" })).toBeOnTheScreen();
    expect(screen.getByText("Segunda · 2 exercícios")).toBeOnTheScreen();
    expect(screen.getAllByText("2 séries · 12 reps · 60 s de descanso")).toHaveLength(2);
    expect(screen.getByText("Série 1: 12 reps · Direta · Carga sugerida 40,5 kg")).toBeOnTheScreen();
    expect(screen.queryByRole("button", { name: /Começar|Editar/ })).toBeNull();
  });
});
