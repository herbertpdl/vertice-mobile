import { fireEvent, screen, waitFor } from "@testing-library/react-native";
import { Platform } from "react-native";

import type { Exercise, FullWorkout } from "@/lib/api/types";
import { clearDrafts } from "@/lib/draftStash";
import { bffError, mockBff, type BffMock, type BffRoutes } from "@/test/bff";
import { renderScreen } from "@/test/render";

import { EditWorkoutScreen, NewWorkoutScreen } from "./WorkoutEditorScreen";

const mockRouter = { push: jest.fn(), back: jest.fn(), replace: jest.fn(), canGoBack: jest.fn(() => true) };
let mockParams: Record<string, string> = {};
jest.mock("expo-router", () => ({
  get router() {
    return mockRouter;
  },
  useLocalSearchParams: () => mockParams,
}));
const mockNavigation = { dispatch: jest.fn() };
let mockPreventRemove: { prevent: boolean; callback: (e: { data: { action: object } }) => void } | null = null;
jest.mock("expo-router/react-navigation", () => ({
  useNavigation: () => mockNavigation,
  usePreventRemove: (prevent: boolean, callback: (e: { data: { action: object } }) => void) => {
    mockPreventRemove = { prevent, callback };
  },
}));
jest.mock("@/lib/auth", () => ({
  useMe: () => ({ data: { id: 1 }, isError: false, isFetching: false, refetch: jest.fn() }),
}));

const supino: Exercise = { id: 1, name: "Supino Reto", description: "", videoUrl: "", isStarter: true, muscleGroups: [{ id: 1, name: "Peito" }] };
const crucifixo: Exercise = { id: 2, name: "Crucifixo", description: "", videoUrl: "", isStarter: false, muscleGroups: [{ id: 1, name: "Peito" }] };

const set = (id: number, setNumber: number, reps: number) => ({
  id,
  workoutExerciseId: 50,
  setNumber,
  reps,
  durationSeconds: 0,
  weight: "40.00",
  loadPercentage: "",
  strategy: "STRAIGHT" as const,
  restSeconds: 60,
  notes: "",
});
const workout: FullWorkout = {
  id: 5,
  name: "Treino A",
  trainingPlanId: 7,
  dayOfWeek: "MONDAY",
  exercises: [
    { id: 50, workoutId: 5, exerciseId: 1, order: 1, restSecondsBetweenSets: 60, notes: "", exercise: supino, sets: [set(500, 1, 12), set(501, 2, 10)] },
  ],
};
const plan = {
  id: 7, name: "Hipertrofia II", description: "", trainerId: 1, clientId: 3,
  startDate: "2026-10-01", endDate: "2026-12-20", level: "INTERMEDIATE", workouts: [],
};

const editRoutes: BffRoutes = {
  "GET /api/workouts/5/full": workout,
  "GET /api/training-plans/7": plan,
  "GET /api/clients": [{ id: 3, name: "Marina Costa" }],
};

let bff: BffMock;
beforeEach(() => {
  jest.replaceProperty(Platform, "OS", "android");
  mockPreventRemove = null;
  clearDrafts();
});
afterEach(() => bff?.restore());

async function openExisting(routes: BffRoutes = {}) {
  mockParams = { id: "5" };
  bff = mockBff({ ...editRoutes, ...routes });
  const view = await renderScreen(<EditWorkoutScreen />);
  await screen.findByLabelText("Repetições da série 1");
  return view;
}

describe("WorkoutEditorScreen — editing", () => {
  it("loads the workout with its breadcrumb and no save bar until something changes", async () => {
    await openExisting();
    expect(screen.getByLabelText("Nome do treino")).toHaveDisplayValue("Treino A");
    expect(await screen.findByLabelText("Marina Costa, Hipertrofia II, Treino A")).toBeOnTheScreen();
    expect(screen.queryByRole("button", { name: "Salvar treino" })).toBeNull();
    await fireEvent.changeText(screen.getByLabelText("Repetições da série 1"), "8");
    expect(screen.getByText("Alterações não salvas")).toBeOnTheScreen();
    expect(mockPreventRemove?.prevent).toBe(true);
  });

  it("saves the whole tree with one PUT, then goes back", async () => {
    await openExisting({ "PUT /api/workouts/5/exercises": workout });
    await fireEvent.changeText(screen.getByLabelText("Repetições da série 1"), "8");
    await fireEvent.press(screen.getByRole("button", { name: "Salvar treino" }));
    await waitFor(() => expect(mockRouter.back).toHaveBeenCalled());
    expect(bff.calls.some((c) => c.route === "PATCH /api/workouts/5")).toBe(false);
    const put = bff.calls.find((c) => c.route === "PUT /api/workouts/5/exercises")?.body as { exercises: { sets: { reps: number }[] }[] };
    expect(put.exercises[0].sets.map((s) => s.reps)).toEqual([8, 10]);
    expect(screen.getByText("Treino salvo.")).toBeOnTheScreen();
  });

  it("falls back to one item at a time on 409, and brings back a set a client recorded data on", async () => {
    await openExisting({
      "PUT /api/workouts/5/exercises": bffError(409, "PRECONDITION_FAILED"),
      "DELETE /api/exercise-sets/501": bffError(409, "PRECONDITION_FAILED"),
    });
    await fireEvent.press(screen.getByRole("button", { name: "Opções da série 2" }));
    await fireEvent.press(screen.getByRole("button", { name: "Remover série" }));
    expect(screen.queryByLabelText("Repetições da série 2")).toBeNull();
    await fireEvent.press(screen.getByRole("button", { name: "Salvar treino" }));
    expect(await screen.findByText(/^Remoção não aplicada\. Um aluno já registrou desempenho em Supino Reto · Série 2/)).toBeOnTheScreen();
    expect(screen.getByLabelText("Repetições da série 2")).toHaveDisplayValue("10");
    expect(mockRouter.back).not.toHaveBeenCalled();
  });

  it("keeps the changes and offers a retry when the save fails", async () => {
    await openExisting({ "PATCH /api/workouts/5": bffError(503, "UPSTREAM_UNAVAILABLE") });
    await fireEvent.changeText(screen.getByLabelText("Nome do treino"), "Treino A — Peito");
    await fireEvent.press(screen.getByRole("button", { name: "Salvar treino" }));
    expect(await screen.findByRole("button", { name: "Tentar novamente" })).toBeOnTheScreen();
    expect(screen.getByLabelText("Nome do treino")).toHaveDisplayValue("Treino A — Peito");
  });

  it("asks before leaving with changes, and leaves on Descartar", async () => {
    await openExisting();
    await fireEvent.changeText(screen.getByLabelText("Nome do treino"), "Treino B");
    const action = { type: "GO_BACK" };
    await waitFor(() => mockPreventRemove?.callback({ data: { action } }));
    expect(await screen.findByText("Descartar alterações?")).toBeOnTheScreen();
    await fireEvent.press(screen.getAllByRole("button", { name: "Descartar" }).at(-1)!);
    expect(mockNavigation.dispatch).toHaveBeenCalledWith(action);
  });

  it("Descartar in the bar puts the saved workout back", async () => {
    await openExisting();
    await fireEvent.press(screen.getByRole("button", { name: "Remover Supino Reto" }));
    expect(screen.getByText("Nenhum exercício ainda")).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole("button", { name: "Descartar" }));
    await fireEvent.press(screen.getAllByRole("button", { name: "Descartar" }).at(-1)!);
    expect(screen.getByLabelText("Repetições da série 1")).toHaveDisplayValue("12");
    expect(screen.queryByText("Alterações não salvas")).toBeNull();
  });

  it("moves sets and exercises from their action sheets", async () => {
    await openExisting();
    await fireEvent.press(screen.getByRole("button", { name: "Opções da série 1" }));
    await fireEvent.press(screen.getByRole("button", { name: "Mover para baixo" }));
    expect(screen.getByLabelText("Repetições da série 1")).toHaveDisplayValue("10");
    await fireEvent.press(screen.getByRole("button", { name: "Opções da série 2" }));
    await fireEvent.press(screen.getByRole("button", { name: "Duplicar série" }));
    expect(screen.getByLabelText("Repetições da série 3")).toHaveDisplayValue("12");
  });

  it("sets a set's strategy and the description the client sees, from its action sheet", async () => {
    await openExisting();
    await fireEvent.press(screen.getByRole("button", { name: "Opções da série 2" }));
    await fireEvent.press(screen.getByRole("button", { name: "Estratégia e descrição" }));
    await fireEvent.press(screen.getByRole("button", { name: "Dropset" }));
    expect(screen.getByText(/^Ao terminar as repetições, reduza a carga/)).toBeOnTheScreen();
    await fireEvent.changeText(screen.getByLabelText("Descrição da estratégia (opcional)"), "  Tire 10 kg duas vezes.  ");
    await fireEvent.press(screen.getByRole("button", { name: "Concluir" }));
    expect(screen.getByLabelText("Dropset, com descrição")).toBeOnTheScreen();

    await fireEvent.press(screen.getByRole("button", { name: "Salvar treino" }));
    await waitFor(() => expect(bff.calls.find((c) => c.route === "PUT /api/workouts/5/exercises")).toBeDefined());
    const put = bff.calls.find((c) => c.route === "PUT /api/workouts/5/exercises")?.body as {
      exercises: { sets: { strategy: string; notes?: string }[] }[];
    };
    expect(put.exercises[0].sets[1]).toMatchObject({ strategy: "DROPSET", notes: "Tire 10 kg duas vezes." });
  });

  it("deletes the workout from ⋮, or says why it can't", async () => {
    await openExisting({ "DELETE /api/workouts/5": bffError(409, "PRECONDITION_FAILED") });
    await fireEvent.press(screen.getByRole("button", { name: "Ações do treino" }));
    await fireEvent.press(screen.getByRole("button", { name: "Excluir treino" }));
    expect(screen.getByText("“Treino A” e todas as suas séries serão removidos do plano.")).toBeOnTheScreen();
    await fireEvent.press(screen.getAllByRole("button", { name: "Excluir treino" }).at(-1)!);
    expect(await screen.findByText("Este treino já tem registros de um aluno e não pode ser excluído.")).toBeOnTheScreen();
    expect(mockRouter.back).not.toHaveBeenCalled();
  });

  it("deletes and goes back", async () => {
    await openExisting({ "DELETE /api/workouts/5": new Response(null, { status: 204 }) });
    await fireEvent.press(screen.getByRole("button", { name: "Ações do treino" }));
    await fireEvent.press(screen.getByRole("button", { name: "Excluir treino" }));
    await fireEvent.press(screen.getAllByRole("button", { name: "Excluir treino" }).at(-1)!);
    await waitFor(() => expect(mockRouter.back).toHaveBeenCalled());
    expect(screen.getByText("Treino excluído.")).toBeOnTheScreen();
  });

  it("deleting with unsaved edits leaves without asking to discard them", async () => {
    await openExisting({ "DELETE /api/workouts/5": new Response(null, { status: 204 }) });
    await fireEvent.changeText(screen.getByLabelText("Repetições da série 1"), "8");
    mockRouter.back.mockImplementation(() => mockPreventRemove?.callback({ data: { action: { type: "GO_BACK" } } }));
    await fireEvent.press(screen.getByRole("button", { name: "Ações do treino" }));
    await fireEvent.press(screen.getByRole("button", { name: "Excluir treino" }));
    await fireEvent.press(screen.getAllByRole("button", { name: "Excluir treino" }).at(-1)!);
    await waitFor(() => expect(mockNavigation.dispatch).toHaveBeenCalledWith({ type: "GO_BACK" }));
    expect(screen.queryByText("Descartar alterações?")).toBeNull();
    mockRouter.back.mockReset();
  });

  it("keeps an unsaved draft across an unmount it wasn't told about (an expired session), and restores it once", async () => {
    const first = await openExisting();
    await fireEvent.changeText(screen.getByLabelText("Repetições da série 1"), "6");
    await first.unmount();
    bff.restore();

    const second = await openExisting();
    expect(screen.getByText("Recuperamos as alterações não salvas deste treino. Salve para não perdê-las.")).toBeOnTheScreen();
    expect(screen.getByLabelText("Repetições da série 1")).toHaveDisplayValue("6");
    expect(screen.getByText("Alterações não salvas")).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole("button", { name: "Descartar" }));
    await fireEvent.press(screen.getAllByRole("button", { name: "Descartar" }).at(-1)!);
    await second.unmount();
    bff.restore();
    await openExisting();
    expect(screen.queryByText(/^Recuperamos/)).toBeNull();
    expect(screen.getByLabelText("Repetições da série 1")).toHaveDisplayValue("12");
  });

  it("redirects a workout that isn't the trainer's", async () => {
    mockParams = { id: "9" };
    bff = mockBff({ "GET /api/workouts/9/full": bffError(404, "NOT_FOUND"), "GET /api/clients": [] });
    await renderScreen(<EditWorkoutScreen />);
    await waitFor(() => expect(mockRouter.back).toHaveBeenCalled());
    expect(screen.getByText("Treino não encontrado.")).toBeOnTheScreen();
  });
});

describe("WorkoutEditorScreen — new", () => {
  const newRoutes: BffRoutes = {
    "GET /api/training-plans/7": plan,
    "GET /api/clients": [{ id: 3, name: "Marina Costa" }],
    "GET /api/exercises": [supino, crucifixo],
    "GET /api/muscle-groups": [],
  };

  it("creates the workout with its exercises in one POST", async () => {
    mockParams = { id: "7", dayOfWeek: "WEDNESDAY" };
    bff = mockBff({
      ...newRoutes,
      "POST /api/training-plans/7/workouts": ({ body }) => Response.json({ ...workout, id: 8, ...(body as object), exercises: [] }),
    });
    await renderScreen(<NewWorkoutScreen />);
    expect(await screen.findByText("Nenhum exercício ainda")).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "Dia da semana: Quarta" })).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "Salvar treino" })).toBeDisabled();
    await fireEvent.changeText(screen.getByLabelText("Nome do treino"), "Treino C");
    await fireEvent.press(screen.getByRole("button", { name: "Adicionar exercício" }));
    await fireEvent.press(await screen.findByRole("checkbox", { name: "Crucifixo" }));
    await fireEvent.press(screen.getByRole("button", { name: "Adicionar 1" }));
    await fireEvent.press(screen.getByRole("button", { name: "Adicionar série em Crucifixo" }));
    await fireEvent.changeText(screen.getByLabelText("Repetições da série 1"), "15");
    await fireEvent.press(screen.getByRole("button", { name: "Salvar treino" }));
    await waitFor(() => expect(mockRouter.back).toHaveBeenCalled());
    expect(bff.calls.find((c) => c.route === "POST /api/training-plans/7/workouts")?.body).toEqual({
      name: "Treino C",
      dayOfWeek: "WEDNESDAY",
      exercises: [{ exerciseId: 2, restSecondsBetweenSets: 60, notes: "", sets: [{ reps: 15, strategy: "STRAIGHT" }] }],
    });
    expect(screen.getByText("Treino criado.")).toBeOnTheScreen();
  });

  it("needs a weekday when the plan's day wasn't given", async () => {
    mockParams = { id: "7" };
    bff = mockBff(newRoutes);
    await renderScreen(<NewWorkoutScreen />);
    await fireEvent.changeText(await screen.findByLabelText("Nome do treino"), "Treino C");
    expect(screen.getByRole("button", { name: "Salvar treino" })).toBeDisabled();
    await fireEvent.press(screen.getByRole("button", { name: "Dia da semana: Selecione" }));
    await fireEvent.press(screen.getByRole("radio", { name: "Sexta" }));
    expect(screen.getByRole("button", { name: "Salvar treino" })).toBeEnabled();
  });

  it("leaves for the roster on a plan id that can't exist", async () => {
    mockParams = { id: "abc" };
    bff = mockBff({ "GET /api/clients": [] });
    await renderScreen(<NewWorkoutScreen />);
    await waitFor(() => expect(mockRouter.replace).toHaveBeenCalledWith("/alunos"));
  });
});
