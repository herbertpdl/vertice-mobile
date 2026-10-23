import { onlineManager } from "@tanstack/react-query";
import { act, fireEvent, screen } from "@testing-library/react-native";

import type { DashboardData } from "@/lib/api/types";
import { bffError, mockBff, type BffMock } from "@/test/bff";
import { renderScreen } from "@/test/render";

import { DashboardScreen, dashboardSummary, latestCompleted } from "./DashboardScreen";

const mockPush = jest.fn();
jest.mock("expo-router", () => ({
  router: {
    push: (...args: unknown[]) => mockPush(...args),
  },
}));
jest.mock("@/lib/auth", () => ({ useMe: () => ({ data: { name: "Ana Paula Souza" } }) }));
jest.mock("@/lib/format", () => ({ ...jest.requireActual("@/lib/format"), greetingFor: () => "Bom dia" }));

const data: DashboardData = {
  stats: { activeClients: 32, activePlans: 18, recentFeedbackCount: 6, expiringPlansCount: 1 },
  recentFeedback: [
    {
      id: 1,
      workoutLogId: 1,
      workoutId: 1,
      trainingPlanId: 1,
      clientId: 7,
      text: "Senti o joelho no agachamento.",
      rating: null,
      replaced: false,
      createdAt: "2026-10-01T10:40:00Z",
      clientName: "Marina Costa",
      workoutName: "Treino B — Inferior",
      trainingPlanName: "Hipertrofia II",
    },
  ],
  expiringPlans: [{ name: "Hipertrofia II", student: "Marina Costa", end: "2026-10-26", daysLeft: 5 }],
  completedToday: [
    { student: "Pedro Alves", workout: "Treino A", time: "99:99", completedAt: "2026-10-21T09:55:00Z" },
    { student: "Camila Souza", workout: "Treino B — Inferior", time: "99:99", completedAt: "2026-10-21T21:10:00Z" },
    { student: "Marina Costa", workout: "Treino B", time: "99:99", completedAt: "2026-10-21T10:40:00Z" },
    { student: "Rafael Lima", workout: "Treino C", time: "99:99", completedAt: "2026-10-21T08:00:00Z" },
  ],
};

let bff: BffMock;
afterEach(() => {
  bff?.restore();
  onlineManager.setOnline(true);
});

describe("dashboardSummary", () => {
  it("pluralizes both counts", () => {
    expect(dashboardSummary(data)).toBe("6 feedbacks · 1 plano terminando");
  });
});

describe("latestCompleted", () => {
  it("is newest first and capped at three", () => {
    expect(latestCompleted(data).map((w) => w.student)).toEqual(["Camila Souza", "Marina Costa", "Pedro Alves"]);
  });
});

describe("DashboardScreen", () => {
  it("greets the trainer by first name and shows the stats and sections", async () => {
    bff = mockBff({ "GET /api/dashboard": data });
    await renderScreen(<DashboardScreen />);
    expect(await screen.findByRole("header", { name: "Bom dia, Ana" })).toBeOnTheScreen();
    expect(screen.getByLabelText("Alunos ativos, 32, com vínculo ativo")).toBeOnTheScreen();
    expect(screen.getByLabelText(/Marina Costa, Hipertrofia II · termina 26 out, 5 dias/)).toBeOnTheScreen();
    expect(screen.getByLabelText("Planos vencendo, 1, próximos 14 dias")).toBeOnTheScreen();
  });

  it("shows when a workout was completed from completedAt in São Paulo, never the deprecated time", async () => {
    bff = mockBff({ "GET /api/dashboard": data });
    await renderScreen(<DashboardScreen />);
    expect(await screen.findByLabelText("Camila Souza concluiu Treino B — Inferior às 18:10")).toBeOnTheScreen();
    expect(screen.queryByText("99:99")).toBeNull();
  });

  it("opens the full feedback list", async () => {
    bff = mockBff({ "GET /api/dashboard": data });
    await renderScreen(<DashboardScreen />);
    await fireEvent.press(await screen.findByRole("button", { name: "Ver todos" }));
    expect(mockPush).toHaveBeenCalledWith("/feedbacks");
  });

  it("says when a section is empty", async () => {
    bff = mockBff({
      "GET /api/dashboard": { ...data, recentFeedback: [], expiringPlans: [], completedToday: [] },
    });
    await renderScreen(<DashboardScreen />);
    expect(await screen.findByText("Nenhum feedback recente.")).toBeOnTheScreen();
    expect(screen.getByText("Nenhum plano vencendo em breve.")).toBeOnTheScreen();
    expect(screen.getByText("Nenhum treino concluído ainda hoje.")).toBeOnTheScreen();
    expect(screen.queryByRole("button", { name: "Ver todos" })).toBeNull();
  });

  it("shows the error state with a retry", async () => {
    let fail = true;
    bff = mockBff({ "GET /api/dashboard": () => (fail ? bffError(503, "UPSTREAM_UNAVAILABLE") : Response.json(data)) });
    await renderScreen(<DashboardScreen />);
    expect(await screen.findByText("Algo deu errado")).toBeOnTheScreen();
    fail = false;
    await fireEvent.press(screen.getByRole("button", { name: "Tentar novamente" }));
    expect(await screen.findByRole("header", { name: "Bom dia, Ana" })).toBeOnTheScreen();
  });

  it("keeps the cached dashboard when a refresh fails, with the error strip", async () => {
    let fail = false;
    bff = mockBff({ "GET /api/dashboard": () => (fail ? bffError(503, "UPSTREAM_UNAVAILABLE") : Response.json(data)) });
    const { testQueryClient } = jest.requireActual("@/test/render");
    const client = testQueryClient();
    await renderScreen(<DashboardScreen />, client);
    await screen.findByRole("header", { name: "Bom dia, Ana" });
    fail = true;
    await act(async () => {
      await client.refetchQueries({ queryKey: ["dashboard"] });
    });
    expect(screen.getByRole("header", { name: "Bom dia, Ana" })).toBeOnTheScreen();
    expect(await screen.findByText("Não foi possível atualizar.")).toBeOnTheScreen();
    expect(screen.queryByText("Algo deu errado")).toBeNull();
  });

  it("shows the offline banner while loading offline, and over cached data", async () => {
    bff = mockBff({ "GET /api/dashboard": data });
    await act(async () => onlineManager.setOnline(false));
    await renderScreen(<DashboardScreen />);
    expect(screen.getByText("Sem conexão com a internet.")).toBeOnTheScreen();
    expect(screen.getByLabelText("Carregando o início")).toBeOnTheScreen();
    await act(async () => onlineManager.setOnline(true));
    expect(await screen.findByRole("header", { name: "Bom dia, Ana" })).toBeOnTheScreen();
    await act(async () => onlineManager.setOnline(false));
    expect(screen.getByText("Sem conexão com a internet.")).toBeOnTheScreen();
    expect(screen.getByRole("header", { name: "Bom dia, Ana" })).toBeOnTheScreen();
  });
});

