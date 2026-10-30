import { fireEvent, screen, waitFor } from "@testing-library/react-native";
import { Platform } from "react-native";

import { bffError, mockBff, type BffMock } from "@/test/bff";
import { renderScreen } from "@/test/render";

import { lastWorkoutStat, StudentDetailScreen } from "./StudentDetailScreen";

const mockRouter = { push: jest.fn(), back: jest.fn(), replace: jest.fn(), dismissTo: jest.fn(), canGoBack: jest.fn(() => true) };
jest.mock("expo-router", () => ({
  get router() {
    return mockRouter;
  },
  useLocalSearchParams: () => ({ id: "7" }),
}));
jest.mock("@/lib/format", () => ({ ...jest.requireActual("@/lib/format"), todayLocalIso: () => "2026-10-21" }));

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
  { id: 1, workoutLogId: 1, workoutId: 1, trainingPlanId: 1, clientId: 7, text: "Joelho ok.", createdAt: "2026-10-01T10:00:00Z", clientName: "Marina Costa", workoutName: "Treino B — Inferior", trainingPlanName: "Hipertrofia II" , rating: null, replaced: false},
  { id: 2, workoutLogId: 2, workoutId: 1, trainingPlanId: 1, clientId: 99, text: "Outro aluno.", createdAt: "2026-10-01T10:00:00Z", clientName: "Rafael", workoutName: "Treino A", trainingPlanName: "Base" , rating: null, replaced: false},
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
  const now = new Date("2026-10-21T15:00:00Z"); // Wed 21/10, 12:00 in São Paulo

  it("is a dash without a workout", () => {
    expect(lastWorkoutStat(null, now)).toEqual({ value: "—", helper: "nenhum ainda" });
  });

  it.each([
    ["2026-10-21T10:40:00Z", "Hoje", "às 07:40"],
    ["2026-10-21T02:30:00Z", "Ontem", "às 23:30"], // 23:30 on the 20th in São Paulo
    ["2026-10-19T21:40:00Z", "Seg", "às 18:40"],
    ["2026-10-10T11:02:00Z", "10 out", "às 08:02"],
  ])("%s → %s %s", (instant, value, helper) => {
    expect(lastWorkoutStat(instant, now)).toEqual({ value, helper });
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
        "GET /api/exercises/with-progress": [{ id: 5, name: "Supino Reto" }],
        "GET /api/exercises/5/progress": [
          { weekStartDate: "2026-09-07", weight: 42.5 },
          { weekStartDate: "2026-09-14", weight: 50 },
        ],
      }),
    );
    await renderScreen(<StudentDetailScreen />);
    await fireEvent.press(await screen.findByRole("tab", { name: "Progresso" }));
    const picker = await screen.findByRole("button", { name: "Exercício: Selecione um exercício" });
    await waitFor(() => expect(picker).toBeEnabled()); // enabled once the exercise list has loaded
    await fireEvent.press(picker);
    await fireEvent.press(screen.getByRole("radio", { name: "Supino Reto" }));
    expect(await screen.findByLabelText("semana de 07/09: 42,5 kg, semana de 14/09: 50 kg")).toBeOnTheScreen();
    expect(bff.calls.find((c) => c.route === "GET /api/exercises/5/progress")).toBeDefined();
  });

  it("says when the student has no recorded loads, without offering the catalog", async () => {
    bff = mockBff(routes({ "GET /api/exercises/with-progress": [] }));
    await renderScreen(<StudentDetailScreen />);
    await fireEvent.press(await screen.findByRole("tab", { name: "Progresso" }));
    expect(await screen.findByText("Sem registros de carga")).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "Exercício: Selecione um exercício" })).toBeDisabled();
    expect(bff.calls.some((c) => c.route === "GET /api/exercises")).toBe(false);
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
    let ended = false;
    bff = mockBff({
      ...routes(),
      "GET /api/clients/7/overview": () => (ended ? bffError(403, "FORBIDDEN") : Response.json(overview)),
      "DELETE /api/clients/7": () => {
        ended = true;
        return new Response(null, { status: 204 });
      },
    });
    await renderScreen(<StudentDetailScreen />);
    await fireEvent.press(await screen.findByRole("button", { name: "Ações do aluno" }));
    await fireEvent.press(screen.getByRole("button", { name: "Encerrar vínculo" }));
    expect(screen.getByText("Encerrar vínculo com Marina Costa?")).toBeOnTheScreen();
    // The dialog's confirm is the last "Encerrar vínculo" button (the action sheet row comes first).
    await fireEvent.press(screen.getAllByRole("button", { name: "Encerrar vínculo" }).at(-1)!);
    await waitFor(() => expect(mockRouter.dismissTo).toHaveBeenCalledWith("/alunos"));
    expect(bff.calls.some((c) => c.route === "DELETE /api/clients/7")).toBe(true);
    // No refetch of the ended student, so no second bounce.
    await new Promise((r) => setTimeout(r, 50));
    expect(bff.calls.filter((c) => c.route === "GET /api/clients/7/overview")).toHaveLength(1);
    expect(mockRouter.back).not.toHaveBeenCalled();
  });

  it("leaves when the student isn't the trainer's (404)", async () => {
    bff = mockBff({ ...routes(), "GET /api/clients/7/overview": bffError(404, "NOT_FOUND") });
    await renderScreen(<StudentDetailScreen />);
    await waitFor(() => expect(mockRouter.back).toHaveBeenCalled());
  });

  it("removes the CPF, or replaces it with the digits typed", async () => {
    jest.replaceProperty(Platform, "OS", "android");
    bff = mockBff(routes({ "PATCH /api/clients/7": overview.student }));
    await renderScreen(<StudentDetailScreen />);
    await fireEvent.press(await screen.findByRole("button", { name: "Ações do aluno" }));
    await fireEvent.press(screen.getByRole("button", { name: "Editar aluno" }));
    await fireEvent.changeText(screen.getByLabelText("CPF"), "123");
    await fireEvent.press(screen.getByRole("checkbox", { name: "Remover o CPF do aluno" }));
    await fireEvent.press(screen.getByRole("button", { name: "Salvar" }));
    await waitFor(() =>
      expect(bff.calls.find((c) => c.route === "PATCH /api/clients/7")?.body).toEqual({ name: "Marina Costa", email: "marina@x.com", cpf: null }),
    );
  });

  it("puts a taken e-mail on the e-mail field", async () => {
    jest.replaceProperty(Platform, "OS", "android");
    bff = mockBff(routes({ "PATCH /api/clients/7": bffError(409, "CONFLICT") }));
    await renderScreen(<StudentDetailScreen />);
    await fireEvent.press(await screen.findByRole("button", { name: "Ações do aluno" }));
    await fireEvent.press(screen.getByRole("button", { name: "Editar aluno" }));
    await fireEvent.changeText(screen.getByLabelText("CPF"), "52998224725");
    await fireEvent.press(screen.getByRole("button", { name: "Salvar" }));
    expect(await screen.findByText("E-mail ou CPF já cadastrado")).toBeOnTheScreen();
    expect(bff.calls.find((c) => c.route === "PATCH /api/clients/7")?.body).toMatchObject({ cpf: "52998224725" });
  });

  it("shows a generated link, and forgets it once the sheet is closed", async () => {
    jest.replaceProperty(Platform, "OS", "android");
    bff = mockBff(routes({ "POST /api/clients/7/setup-token": { token: "tok-9", expiresAt: "2099-01-01T12:00:00Z" } }));
    await renderScreen(<StudentDetailScreen />);
    await fireEvent.press(await screen.findByRole("button", { name: "Ações do aluno" }));
    await fireEvent.press(screen.getByRole("button", { name: "Link de acesso" }));
    await fireEvent.press(screen.getByRole("button", { name: "Gerar link" }));
    expect(await screen.findByText(/definir-senha\?token=tok-9/)).toBeOnTheScreen();
    await fireEvent.press(screen.getAllByRole("button", { name: "Fechar" }).at(-1)!);
    await fireEvent.press(screen.getByRole("button", { name: "Ações do aluno" }));
    await fireEvent.press(screen.getByRole("button", { name: "Link de acesso" }));
    expect(screen.queryByText(/tok-9/)).toBeNull();
    expect(screen.getByRole("button", { name: "Gerar link" })).toBeOnTheScreen();
  });
});

