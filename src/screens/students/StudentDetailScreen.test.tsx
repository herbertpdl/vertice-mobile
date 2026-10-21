import { fireEvent, screen, waitFor } from "@testing-library/react-native";
import { Platform } from "react-native";

import { bffError, mockBff, type BffMock } from "@/test/bff";
import { renderScreen } from "@/test/render";

import { lastWorkoutStat, StudentDetailScreen } from "./StudentDetailScreen";

const mockRouter = { push: jest.fn(), back: jest.fn(), replace: jest.fn(), canGoBack: jest.fn(() => true) };
jest.mock("expo-router", () => ({
  get router() {
    return mockRouter;
  },
  useLocalSearchParams: () => ({ id: "7" }),
}));

const overview = {
  student: { id: 7, name: "Marina Costa", email: "marina@x.com", cpf: "***.***.***-25", role: "CLIENT" },
  activePlan: { id: 1, name: "Hipertrofia II", level: "INTERMEDIATE", startDate: "2026-09-01", endDate: "2026-11-24" },
  thisWeek: { completed: 3, total: 5 },
  lastWorkoutAt: null,
  adherence4Weeks: 95,
};
const plans = [
  { id: 2, name: "Base de força", description: "", trainerId: 1, clientId: 7, startDate: "2025-10-07", endDate: "2025-12-20", level: "BEGINNER" },
  { id: 1, name: "Hipertrofia II", description: "", trainerId: 1, clientId: 7, startDate: "2026-09-01", endDate: "2099-11-24", level: "INTERMEDIATE" },
];
const feedback = [
  { id: 1, workoutLogId: 1, workoutId: 1, trainingPlanId: 1, clientId: 7, text: "Joelho ok.", createdAt: "2026-10-01T10:00:00Z", clientName: "Marina Costa", workoutName: "Treino B — Inferior", trainingPlanName: "Hipertrofia II" },
  { id: 2, workoutLogId: 2, workoutId: 1, trainingPlanId: 1, clientId: 99, text: "Outro aluno.", createdAt: "2026-10-01T10:00:00Z", clientName: "Rafael", workoutName: "Treino A", trainingPlanName: "Base" },
];

const routes = (extra: Record<string, unknown> = {}) => ({
  "GET /api/clients/7/overview": overview,
  "GET /api/training-plans": plans,
  "GET /api/feedback": feedback,
  ...extra,
});

let bff: BffMock;
afterEach(() => {
  bff?.restore();
  jest.restoreAllMocks();
});

describe("lastWorkoutStat", () => {
  it("is a dash without a workout", () => {
    expect(lastWorkoutStat(null)).toEqual({ value: "—", helper: "nenhum ainda" });
  });
});

describe("StudentDetailScreen", () => {
  it("shows the student, the stats and the plans (active first)", async () => {
    bff = mockBff(routes());
    await renderScreen(<StudentDetailScreen />);
    expect(await screen.findByRole("header", { name: "Marina Costa" })).toBeOnTheScreen();
    expect(screen.getByLabelText("Esta semana, 3 de 5, treinos concluídos")).toBeOnTheScreen();
    expect(screen.getByLabelText("Adesão, 95%, últimas 4 semanas")).toBeOnTheScreen();
    const cards = await screen.findAllByRole("button", { name: /· (Intermediário|Iniciante)/ });
    expect(cards.map((c) => c.props.accessibilityLabel.split(",")[0])).toEqual(["Hipertrofia II", "Base de força"]);
    expect(bff.calls.find((c) => c.route === "GET /api/training-plans")).toBeDefined();
    await fireEvent.press(cards[0]);
    expect(mockRouter.push).toHaveBeenCalledWith("/planos/1");
  });

  it("lists only this student's feedback, with the count on the tab", async () => {
    bff = mockBff(routes());
    await renderScreen(<StudentDetailScreen />);
    await fireEvent.press(await screen.findByRole("tab", { name: "Feedbacks, 1" }));
    expect(await screen.findByText("“Joelho ok.”")).toBeOnTheScreen();
    expect(screen.queryByText("“Outro aluno.”")).toBeNull();
  });

  it("charts the max weight per week for the chosen exercise", async () => {
    bff = mockBff(
      routes({
        "GET /api/exercises": [{ id: 5, name: "Supino Reto", description: "", videoUrl: "", muscleGroups: [], isStarter: false }],
        "GET /api/exercises/5/progress": [
          { weekStartDate: "2026-09-07", weight: 42.5 },
          { weekStartDate: "2026-09-14", weight: 50 },
        ],
      }),
    );
    await renderScreen(<StudentDetailScreen />);
    await fireEvent.press(await screen.findByRole("tab", { name: "Progresso" }));
    await fireEvent.press(await screen.findByRole("button", { name: "Exercício: Selecione um exercício" }));
    await fireEvent.press(screen.getByRole("radio", { name: "Supino Reto" }));
    expect(await screen.findByLabelText("semana de 07/09: 42,5 kg, semana de 14/09: 50 kg")).toBeOnTheScreen();
    expect(bff.calls.find((c) => c.route === "GET /api/exercises/5/progress")).toBeDefined();
  });

  it("edits the student without sending the masked CPF", async () => {
    jest.replaceProperty(Platform, "OS", "android");
    bff = mockBff(routes({ "PATCH /api/clients/7": { ...overview.student, name: "Marina C." } }));
    await renderScreen(<StudentDetailScreen />);
    await fireEvent.press(await screen.findByRole("button", { name: "Ações do aluno" }));
    await fireEvent.press(screen.getByRole("button", { name: "Editar aluno" }));
    await fireEvent.changeText(screen.getByLabelText("Nome completo"), "Marina C.");
    await fireEvent.press(screen.getByRole("button", { name: "Salvar" }));
    await waitFor(() =>
      expect(bff.calls.find((c) => c.route === "PATCH /api/clients/7")?.body).toEqual({ name: "Marina C.", email: "marina@x.com" }),
    );
  });

  it("generates an access link on demand, and says when the password is already set", async () => {
    jest.replaceProperty(Platform, "OS", "android");
    bff = mockBff(routes({ "POST /api/clients/7/setup-token": bffError(409, "PRECONDITION_FAILED") }));
    await renderScreen(<StudentDetailScreen />);
    await fireEvent.press(await screen.findByRole("button", { name: "Ações do aluno" }));
    await fireEvent.press(screen.getByRole("button", { name: "Link de acesso" }));
    expect(screen.getByText("Gerar um link invalida o anterior, se houver.")).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole("button", { name: "Gerar link" }));
    expect(await screen.findByText("O aluno já definiu a senha")).toBeOnTheScreen();
  });

  it("ends the relationship after confirming, then leaves", async () => {
    jest.replaceProperty(Platform, "OS", "android");
    bff = mockBff(routes({ "DELETE /api/clients/7": new Response(null, { status: 204 }) }));
    await renderScreen(<StudentDetailScreen />);
    await fireEvent.press(await screen.findByRole("button", { name: "Ações do aluno" }));
    await fireEvent.press(screen.getByRole("button", { name: "Encerrar vínculo" }));
    expect(screen.getByText("Encerrar vínculo com Marina Costa?")).toBeOnTheScreen();
    // The dialog's confirm is the last "Encerrar vínculo" button (the action sheet row comes first).
    await fireEvent.press(screen.getAllByRole("button", { name: "Encerrar vínculo" }).at(-1)!);
    await waitFor(() => expect(mockRouter.back).toHaveBeenCalled());
    expect(bff.calls.some((c) => c.route === "DELETE /api/clients/7")).toBe(true);
  });

  it("leaves when the student isn't the trainer's (404)", async () => {
    bff = mockBff({ ...routes(), "GET /api/clients/7/overview": bffError(404, "NOT_FOUND") });
    await renderScreen(<StudentDetailScreen />);
    await waitFor(() => expect(mockRouter.back).toHaveBeenCalled());
  });
});
