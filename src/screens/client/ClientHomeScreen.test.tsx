import { act, fireEvent, screen } from "@testing-library/react-native";

import { mockBff, type BffMock } from "@/test/bff";
import { renderScreen } from "@/test/render";

import { ClientHomeScreen, workoutSummary } from "./ClientHomeScreen";
import { full, log, plan, planDetail, workout } from "./fixtures";

const mockPush = jest.fn();
const mockNavigate = jest.fn();
jest.mock("expo-router", () => ({
  router: {
    push: (...args: unknown[]) => mockPush(...args),
    navigate: (...args: unknown[]) => mockNavigate(...args),
  },
}));
jest.mock("@/lib/auth", () => ({ useMe: () => ({ data: { name: "Marina Costa", role: "CLIENT" } }) }));
jest.mock("@/lib/format", () => ({
  ...jest.requireActual("@/lib/format"),
  greetingFor: () => "Bom dia",
  todayLocalIso: () => "2026-10-21",
}));

const monday = workout(11, "MONDAY", "Treino A");
const wednesday = workout(12, "WEDNESDAY", "Treino B");
const friday = workout(13, "FRIDAY", "Treino C");

function routes(workouts = [monday, wednesday, friday], logs = [log(11, "2026-10-19T11:00:00Z", "2026-10-19T10:00:00Z")]) {
  return {
    "GET /api/training-plans": [plan],
    "GET /api/training-plans/1": planDetail(workouts),
    "GET /api/workout-logs": logs,
    ...Object.fromEntries(workouts.map((w) => [`GET /api/workouts/${w.id}/full`, full(w)])),
  };
}

let bff: BffMock;
afterEach(() => {
  bff?.restore();
  jest.clearAllMocks();
});

describe("workoutSummary", () => {
  it("counts exercises and sets", () => {
    expect(workoutSummary(full(wednesday, 2, 3))).toBe("2 exercícios · 6 séries");
    expect(workoutSummary(undefined)).toBe("");
  });
});

describe("ClientHomeScreen", () => {
  it("greets, shows the active plan with today's workout and starts it", async () => {
    bff = mockBff(routes());
    await renderScreen(<ClientHomeScreen />);
    expect(await screen.findByRole("header", { name: "Bom dia, Marina" })).toBeOnTheScreen();
    expect(screen.getByText("Quarta-feira, 21 de outubro")).toBeOnTheScreen();
    expect(await screen.findByText("Treino B")).toBeOnTheScreen();
    expect(screen.getByText("TREINO DE HOJE · QUA")).toBeOnTheScreen();
    expect(await screen.findByText("2 exercícios · 6 séries")).toBeOnTheScreen();
    expect(screen.getByLabelText(/^Esta semana: Segunda concluído, Terça descanso, Quarta hoje/)).toBeOnTheScreen();
    expect(screen.getByText("1 de 3 treinos concluídos")).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole("button", { name: "Começar treino" }));
    expect(mockPush).toHaveBeenCalledWith("/aluno/treino/12");
    const weekCall = bff.calls.find((c) => c.route === "GET /api/workout-logs");
    expect(weekCall).toBeDefined();
  });

  it("continues a session in progress", async () => {
    bff = mockBff(routes(undefined, [log(13, "", "2026-10-21T10:12:00Z")]));
    await renderScreen(<ClientHomeScreen />);
    expect(await screen.findByText("EM ANDAMENTO · INICIADO ÀS 07:12")).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole("button", { name: "Continuar treino" }));
    expect(mockPush).toHaveBeenCalledWith("/aluno/treino/13");
  });

  it("offers another workout once today's is done, through the picker", async () => {
    bff = mockBff(routes(undefined, [log(12, "2026-10-21T10:58:00Z")]));
    await renderScreen(<ClientHomeScreen />);
    expect(await screen.findByText("CONCLUÍDO · 07:58")).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole("button", { name: "Treinar outro treino" }));
    expect(await screen.findByRole("button", { name: "Quarta: Treino B. Feito esta semana" })).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole("button", { name: "Sexta: Treino C. 2 exercícios" }));
    expect(mockPush).toHaveBeenCalledWith("/aluno/treino/13");
  });

  it("opens the picker with a notice on a day without a workout", async () => {
    bff = mockBff(routes([monday, friday], []));
    await renderScreen(<ClientHomeScreen />);
    expect(await screen.findByText("Sem treino programado hoje")).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole("button", { name: "Começar treino" }));
    expect(await screen.findByText("Hoje (quarta) não tem treino no seu plano. Escolha qual quer fazer.")).toBeOnTheScreen();
  });

  it("disables the button when the plan has no workouts", async () => {
    bff = mockBff(routes([], []));
    await renderScreen(<ClientHomeScreen />);
    expect(await screen.findByText("Nenhum treino neste plano ainda")).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "Começar treino" })).toBeDisabled();
  });

  it("shows the empty state when no plan runs today", async () => {
    bff = mockBff({ "GET /api/training-plans": [{ ...plan, startDate: "2026-11-01", endDate: "2026-12-31" }] });
    await renderScreen(<ClientHomeScreen />);
    expect(await screen.findByText("Nenhum plano em andamento")).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole("button", { name: "Ver meus planos" }));
    expect(mockNavigate).toHaveBeenCalledWith("/aluno/planos");
  });

  it("links to the other plans", async () => {
    bff = mockBff(routes());
    await renderScreen(<ClientHomeScreen />);
    await act(async () => {});
    await fireEvent.press(await screen.findByRole("button", { name: "Ver outros planos" }));
    expect(mockNavigate).toHaveBeenCalledWith("/aluno/planos");
  });
});
