import { onlineManager } from "@tanstack/react-query";
import { act, fireEvent, screen, waitFor } from "@testing-library/react-native";

import { mockBff, type BffMock } from "@/test/bff";
import { renderScreen } from "@/test/render";
import { clearWorkoutData, openOutbox } from "@/lib/workoutSession/outbox";

import { WorkoutFeedbackScreen } from "./WorkoutFeedbackScreen";

const mockReplace = jest.fn();
jest.mock("expo-router", () => ({
  router: { replace: (...args: unknown[]) => mockReplace(...args) },
  useLocalSearchParams: () => ({ logId: "500", name: "Treino C", summary: "22 de 22 séries" }),
}));

let bff: BffMock;
// The client app's layout opens the signed-in client's outbox (§3.4); the screens are tested without it.
beforeEach(() => openOutbox(7, () => {}));
afterEach(() => clearWorkoutData());
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

  it("offline, goes home and sends the feedback when the connection returns (R56–R58)", async () => {
    bff = mockBff({ "POST /api/workout-logs/500/feedback": {} });
    onlineManager.setOnline(false);
    try {
      await renderScreen(<WorkoutFeedbackScreen />);
      await fireEvent.press(screen.getByRole("radio", { name: "Fácil" }));
      await fireEvent.press(screen.getByRole("button", { name: "Enviar feedback" }));
      expect(await screen.findByText("Seu feedback será enviado quando a conexão voltar.")).toBeOnTheScreen();
      expect(mockReplace).toHaveBeenCalledWith("/aluno");
      expect(bff.calls).toHaveLength(0);
      await act(async () => onlineManager.setOnline(true));
      await waitFor(() => expect(bff.calls.map((c) => c.route)).toEqual(["POST /api/workout-logs/500/feedback"]));
    } finally {
      onlineManager.setOnline(true);
    }
  });

  it("skips without sending anything", async () => {
    bff = mockBff({});
    await renderScreen(<WorkoutFeedbackScreen />);
    await fireEvent.press(screen.getByRole("button", { name: "Pular" }));
    expect(mockReplace).toHaveBeenCalledWith("/aluno");
    expect(bff.calls).toHaveLength(0);
  });
});
