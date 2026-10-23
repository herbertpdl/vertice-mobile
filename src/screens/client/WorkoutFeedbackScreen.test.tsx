import { fireEvent, screen, waitFor } from "@testing-library/react-native";

import { mockBff, type BffMock } from "@/test/bff";
import { renderScreen } from "@/test/render";

import { WorkoutFeedbackScreen } from "./WorkoutFeedbackScreen";

const mockReplace = jest.fn();
jest.mock("expo-router", () => ({
  router: { replace: (...args: unknown[]) => mockReplace(...args) },
  useLocalSearchParams: () => ({ logId: "500", name: "Treino C", summary: "22 de 22 séries" }),
}));

let bff: BffMock;
afterEach(() => {
  bff?.restore();
  jest.clearAllMocks();
});

describe("WorkoutFeedbackScreen", () => {
  it("needs a rating, then sends it with the optional comment", async () => {
    bff = mockBff({
      "POST /api/workout-logs/500/feedback": { id: 1, workoutLogId: 500, workoutId: 12, trainingPlanId: 1, clientId: 7, text: "Pesado", rating: "HARD", replaced: false, createdAt: "2026-10-21T11:00:00Z" },
    });
    await renderScreen(<WorkoutFeedbackScreen />);
    expect(screen.getByText("Treino C · 22 de 22 séries")).toBeOnTheScreen();
    const send = screen.getByRole("button", { name: "Enviar feedback" });
    expect(send).toBeDisabled();
    await fireEvent.press(screen.getByRole("radio", { name: "Difícil" }));
    await fireEvent.changeText(screen.getByLabelText("Quer contar algo ao seu treinador? (opcional)"), "  Pesado  ");
    await fireEvent.press(screen.getByRole("button", { name: "Enviar feedback" }));
    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith("/aluno"));
    expect(bff.calls.find((c) => c.route === "POST /api/workout-logs/500/feedback")?.body).toEqual({ rating: "HARD", text: "Pesado" });
  });

  it("skips without sending anything", async () => {
    bff = mockBff({});
    await renderScreen(<WorkoutFeedbackScreen />);
    await fireEvent.press(screen.getByRole("button", { name: "Pular" }));
    expect(mockReplace).toHaveBeenCalledWith("/aluno");
    expect(bff.calls).toHaveLength(0);
  });
});
