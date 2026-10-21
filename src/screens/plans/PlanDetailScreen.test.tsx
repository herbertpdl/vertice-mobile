import { fireEvent, screen, waitFor } from "@testing-library/react-native";
import { Platform } from "react-native";

import { bffError, mockBff, type BffMock } from "@/test/bff";
import { renderScreen } from "@/test/render";

import { deletePlanMessage, PlanDetailScreen, workoutsByDay } from "./PlanDetailScreen";

const mockRouter = { push: jest.fn(), back: jest.fn(), replace: jest.fn(), canGoBack: jest.fn(() => true) };
jest.mock("expo-router", () => ({
  get router() {
    return mockRouter;
  },
  useLocalSearchParams: () => ({ id: "1" }),
}));

const plan = {
  id: 1,
  name: "Hipertrofia II",
  description: "Volume progressivo.",
  trainerId: 1,
  clientId: 7,
  startDate: "2026-03-01",
  endDate: "2099-05-24",
  level: "INTERMEDIATE",
  workouts: [
    { id: 10, name: "Treino A — Peito", trainingPlanId: 1, dayOfWeek: "MONDAY" },
    { id: 11, name: "Treino B — Inferior", trainingPlanId: 1, dayOfWeek: "TUESDAY" },
  ],
};
const routes = (extra: Record<string, unknown> = {}) => ({
  "GET /api/training-plans/1": plan,
  "GET /api/clients": [{ id: 7, name: "Marina Costa", activePlanCount: 1, currentPlan: null, lastWorkoutAt: null, weekActivity: [] }],
  ...extra,
});

let bff: BffMock;
afterEach(() => {
  bff?.restore();
  jest.restoreAllMocks();
});

describe("workoutsByDay", () => {
  it("lays the week out Monday first, rest days empty", () => {
    const week = workoutsByDay(plan.workouts as never);
    expect(week.map((d) => d.day)).toEqual(["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY"]);
    expect(week[0].workouts).toHaveLength(1);
    expect(week[2].workouts).toHaveLength(0);
  });
});

describe("deletePlanMessage", () => {
  it("counts the workouts, including none and one", () => {
    expect(deletePlanMessage("Base", 0)).toBe("O plano “Base” será excluído. Essa ação não pode ser desfeita.");
    expect(deletePlanMessage("Base", 1)).toBe("O plano “Base” e seu treino serão excluídos. Essa ação não pode ser desfeita.");
    expect(deletePlanMessage("Base", 4)).toBe("O plano “Base” e seus 4 treinos serão excluídos. Essa ação não pode ser desfeita.");
  });
});

describe("PlanDetailScreen", () => {
  it("shows the plan, its info and the week", async () => {
    bff = mockBff(routes());
    await renderScreen(<PlanDetailScreen />);
    expect(await screen.findByRole("header", { name: "Hipertrofia II" })).toBeOnTheScreen();
    expect(await screen.findByText("Volume progressivo. Aluno: Marina Costa.")).toBeOnTheScreen();
    expect(screen.getByLabelText("TREINOS: 2 treinos")).toBeOnTheScreen();
    expect(screen.getByLabelText("NÍVEL: Intermediário")).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole("button", { name: "Segunda: Treino A — Peito" }));
    expect(mockRouter.push).toHaveBeenCalledWith("/treinos/10");
    await fireEvent.press(screen.getByRole("button", { name: "Quarta: descanso. Adicionar treino" }));
    expect(mockRouter.push).toHaveBeenCalledWith("/planos/1/treinos/novo?dayOfWeek=WEDNESDAY");
  });

  it("explains a refused delete (the plan has recorded training)", async () => {
    jest.replaceProperty(Platform, "OS", "android");
    bff = mockBff(routes({ "DELETE /api/training-plans/1": bffError(409, "PRECONDITION_FAILED") }));
    await renderScreen(<PlanDetailScreen />);
    await fireEvent.press(await screen.findByRole("button", { name: "Ações do plano" }));
    await fireEvent.press(screen.getByRole("button", { name: "Excluir plano" }));
    expect(screen.getByText("O plano “Hipertrofia II” e seus 2 treinos serão excluídos. Essa ação não pode ser desfeita.")).toBeOnTheScreen();
    await fireEvent.press(screen.getAllByRole("button", { name: "Excluir plano" }).at(-1)!);
    expect(await screen.findByText("Este plano já tem treinos registrados e não pode ser excluído.")).toBeOnTheScreen();
    expect(mockRouter.back).not.toHaveBeenCalled();
  });

  it("deletes and leaves once, without refetching the deleted plan", async () => {
    jest.replaceProperty(Platform, "OS", "android");
    let deleted = false;
    bff = mockBff({
      ...routes(),
      "GET /api/training-plans/1": () => (deleted ? bffError(404, "NOT_FOUND") : Response.json(plan)),
      "DELETE /api/training-plans/1": () => {
        deleted = true;
        return new Response(null, { status: 204 });
      },
    });
    await renderScreen(<PlanDetailScreen />);
    await fireEvent.press(await screen.findByRole("button", { name: "Ações do plano" }));
    await fireEvent.press(screen.getByRole("button", { name: "Excluir plano" }));
    await fireEvent.press(screen.getAllByRole("button", { name: "Excluir plano" }).at(-1)!);
    await waitFor(() => expect(mockRouter.back).toHaveBeenCalled());
    await new Promise((r) => setTimeout(r, 50));
    expect(mockRouter.back).toHaveBeenCalledTimes(1);
    expect(bff.calls.filter((c) => c.route === "GET /api/training-plans/1")).toHaveLength(1);
    expect(screen.queryByText("Plano não encontrado.")).toBeNull();
  });
});
