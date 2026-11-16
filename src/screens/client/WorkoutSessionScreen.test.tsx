import { onlineManager } from "@tanstack/react-query";
import { act, fireEvent, screen, waitFor } from "@testing-library/react-native";
import * as Notifications from "expo-notifications";
import * as Haptics from "expo-haptics";
import { AppState, Platform, Vibration } from "react-native";

import { EXERCISE_DONE_MS } from "@/components/ui/Celebration";
import { ApiError } from "@/lib/api/client";
import { apiErrorMessage } from "@/lib/api/errorMessages";
import type { FullWorkout, WorkoutLog, WorkoutSession } from "@/lib/api/types";
import { session, set, setLog } from "@/lib/workoutSession/fixtures";
import { bffError, mockBff, type BffMock, type BffRoutes } from "@/test/bff";
import { renderScreen, testQueryClient } from "@/test/render";
import { initSession } from "@/lib/workoutSession/engine";
import { workoutLogsQueryKey } from "@/lib/api/workoutSessions";
import { weekStartOf } from "@/lib/calendar";
import { todayLocalIso } from "@/lib/format";
import { clearWorkoutData, enqueue, openOutbox, readLocalSession, saveLocalSession } from "@/lib/workoutSession/outbox";

import { setHint, WorkoutSessionScreen } from "./WorkoutSessionScreen";

const mockReplace = jest.fn();
const mockBack = jest.fn();
jest.mock("expo-router", () => ({
  router: {
    replace: (...args: unknown[]) => mockReplace(...args),
    back: (...args: unknown[]) => mockBack(...args),
    canGoBack: () => true,
    push: jest.fn(),
  },
  useLocalSearchParams: () => ({ workoutId: "12" }),
}));
const mockNavigation = { dispatch: jest.fn() };
let mockPreventRemove: { prevent: boolean; callback: (e: { data: { action: { type: string } } }) => void } | null = null;
jest.mock("expo-router/react-navigation", () => ({
  useNavigation: () => mockNavigation,
  usePreventRemove: (prevent: boolean, callback: (e: { data: { action: { type: string } } }) => void) => {
    mockPreventRemove = { prevent, callback };
  },
}));
jest.mock("@/lib/auth", () => ({ useMe: () => ({ data: { id: 7, name: "Marina", role: "CLIENT" } }) }));

/** "Remada" (two sets, 60 s rest) then "Prancha" (a 30 s hold). */
function workout(over: Partial<WorkoutSession> = {}): WorkoutSession {
  return {
    ...session([
      { id: 1, order: 1, name: "Remada", sets: [set(11, 1, { lastPerformed: setLog(11, "40.00") }), set(12, 2)] },
      { id: 2, order: 2, name: "Prancha", sets: [set(21, 1, { reps: 0, durationSeconds: 30, strategy: "ISOMETRIC_HOLD", restSeconds: 0 })] },
    ]),
    ...over,
  };
}

/** The workout tree the overview reads before a session exists, as `GET /workouts/12/full` answers it. */
function tree(s: WorkoutSession): FullWorkout {
  const { workoutLog: _log, ...rest } = s;
  return { ...rest, exercises: rest.exercises.map((e) => ({ ...e, sets: e.sets.map(({ lastPerformed: _l, current: _c, ...plain }) => plain) })) };
}

/**
 * The BFF of workout 12 this week: its tree, the week's logs (by default the session's, in
 * progress) and the session.
 */
function routes(s: WorkoutSession, extra: BffRoutes = {}, logs: WorkoutLog[] = [s.workoutLog]): BffRoutes {
  return { "GET /api/workouts/12/full": tree(s), "GET /api/workout-logs": logs, "GET /api/workouts/12/session": s, ...extra };
}

/** From the overview into the session, the way a client continues it. */
async function train() {
  await fireEvent.press(await screen.findByRole("button", { name: "Continuar treino" }));
}

const finishedLog = (s: WorkoutSession): WorkoutLog => ({ ...s.workoutLog, status: "COMPLETED", completionKind: "CLIENT", completedAt: "2026-10-20T11:00:00Z" });

let bff: BffMock;
beforeEach(() => {
  jest.spyOn(Vibration, "vibrate").mockImplementation(() => {});
});
// The client app's layout opens the signed-in client's outbox (§3.4); the screens are tested without it.
beforeEach(() => openOutbox(7, () => {}));
afterEach(() => {
  clearWorkoutData();
  onlineManager.setOnline(true);
});
/** The Jest native mock leaves `AppState.currentState` unset; the screen reads it on a rest's end. */
const appState = AppState as { currentState: string };
let initialAppState: string;
beforeEach(() => {
  initialAppState = appState.currentState;
  appState.currentState = "active";
});
afterEach(() => {
  appState.currentState = initialAppState;
  bff?.restore();
  jest.clearAllMocks();
  jest.useRealTimers();
});

describe("setHint", () => {
  it("shows last time's weight, then the trainer's load; a note belongs to the strategy", () => {
    expect(setHint(set(1, 1, { notes: "Segure 1 s" }))).toBeUndefined();
    expect(setHint(set(1, 1, { lastPerformed: setLog(1, "42.50"), notes: "Segure 1 s" }))).toBe("Última vez: 42,5 kg");
    expect(setHint(set(1, 1, { weight: "40" }))).toBe("Carga sugerida 40 kg");
    expect(setHint(set(1, 1))).toBeUndefined();
  });
});

describe("WorkoutSessionScreen — overview", () => {
  it("shows a workout not started from its tree and the week, starting nothing (R4, R8–R13, R15)", async () => {
    bff = mockBff(routes(workout(), {}, []));
    await renderScreen(<WorkoutSessionScreen />);
    expect(await screen.findByRole("button", { name: "Começar treino" })).toBeOnTheScreen();
    expect(screen.getByRole("header", { name: "Treino B" })).toBeOnTheScreen();
    expect(screen.getByText("2 exercícios · 3 séries")).toBeOnTheScreen();
    expect(screen.getByText("Toque em um exercício para começar por ele.")).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "Exercício 1: Remada. 2 séries · 12 reps" })).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "Exercício 2: Prancha. 1 × 30 s" })).toBeOnTheScreen();
    expect(screen.queryByText(/ de \d/)).toBeNull();
    expect(bff.calls.some((c) => c.route === "GET /api/workouts/12/session")).toBe(false);
  });

  it("leaves a workout not started with no session (R6, E4)", async () => {
    bff = mockBff(routes(workout(), {}, []));
    await renderScreen(<WorkoutSessionScreen />);
    await screen.findByRole("button", { name: "Começar treino" });
    await fireEvent.press(screen.getByRole("button", { name: "Voltar" }));
    expect(mockBack).toHaveBeenCalled();
    expect(bff.calls.some((c) => c.route === "GET /api/workouts/12/session")).toBe(false);
  });

  it("starts the session on the exercise tapped (R5, R14)", async () => {
    bff = mockBff(routes(workout(), {}, []));
    await renderScreen(<WorkoutSessionScreen />);
    await fireEvent.press(await screen.findByRole("button", { name: /^Exercício 2: Prancha/ }));
    expect(await screen.findByRole("header", { name: "Prancha" })).toBeOnTheScreen();
    expect(screen.getByText("EXERCÍCIO 2 DE 2")).toBeOnTheScreen();
    expect(bff.calls.filter((c) => c.route === "GET /api/workouts/12/session")).toHaveLength(1);
  });

  it("starts from the first exercise with “Começar treino” (R15)", async () => {
    bff = mockBff(routes(workout(), {}, []));
    await renderScreen(<WorkoutSessionScreen />);
    await fireEvent.press(await screen.findByRole("button", { name: "Começar treino" }));
    expect(await screen.findByRole("header", { name: "Remada" })).toBeOnTheScreen();
  });

  it("says it's offline instead of starting a workout without a connection (E3, E28)", async () => {
    bff = mockBff(routes(workout(), {}, []));
    await renderScreen(<WorkoutSessionScreen />);
    await screen.findByRole("button", { name: "Começar treino" });
    await act(async () => onlineManager.setOnline(false));
    await fireEvent.press(screen.getByRole("button", { name: /^Exercício 1: Remada/ }));
    expect(await screen.findByText("Sem conexão. Conecte-se à internet para abrir este treino.")).toBeOnTheScreen();
    expect(bff.calls.some((c) => c.route === "GET /api/workouts/12/session")).toBe(false);
  });

  it("shows the progress of a session in progress and continues at the first exercise with sets left (R11, R12, R16)", async () => {
    const resumed = workout();
    resumed.exercises[0].sets = resumed.exercises[0].sets.map((s) => ({ ...s, current: setLog(s.id, "40") }));
    bff = mockBff(routes(resumed));
    await renderScreen(<WorkoutSessionScreen />);
    expect(await screen.findByText("2 de 3 séries feitas")).toBeOnTheScreen();
    expect(screen.getByText("Toque em um exercício para ir até ele.")).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: /^Exercício 1: Remada.*2 de 2 séries, concluído$/ })).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: /^Exercício 2: Prancha.*0 de 1 série$/ })).toBeOnTheScreen();
    await train();
    expect(await screen.findByRole("header", { name: "Prancha" })).toBeOnTheScreen();
  });

  it("opens a done exercise, its sets still editable (E1)", async () => {
    const resumed = workout();
    resumed.exercises[0].sets = resumed.exercises[0].sets.map((s) => ({ ...s, current: setLog(s.id, "40") }));
    bff = mockBff(routes(resumed));
    await renderScreen(<WorkoutSessionScreen />);
    await fireEvent.press(await screen.findByRole("button", { name: /^Exercício 1: Remada/ }));
    expect(await screen.findByRole("checkbox", { name: "Série 1 feita" })).toBeChecked();
  });

  it("finishes from the overview when no set is left (R17, E7)", async () => {
    const all = workout();
    all.exercises = all.exercises.map((e) => ({ ...e, sets: e.sets.map((s) => ({ ...s, current: setLog(s.id, "") })) }));
    bff = mockBff(
      routes(all, { "POST /api/workout-sessions/500/complete": { ...finishedLog(all), completedAt: "2026-10-21T11:00:00Z" } }),
    );
    await renderScreen(<WorkoutSessionScreen />);
    await fireEvent.press(await screen.findByRole("button", { name: "Finalizar treino" }));
    await waitFor(() =>
      expect(mockReplace).toHaveBeenCalledWith(expect.objectContaining({ pathname: "/aluno/treino/feedback/[logId]" })),
    );
  });

  it("returns to the overview from an exercise — back, “Ver todos”, the swipe — with the session as it was (R23, R24)", async () => {
    bff = mockBff(routes(workout(), { "POST /api/workout-sessions/500/sets": setLog(11, "40") }));
    await renderScreen(<WorkoutSessionScreen />);
    await train();
    await fireEvent.press(await screen.findByRole("checkbox", { name: "Série 1 feita" }));
    await fireEvent.press(screen.getByRole("button", { name: "Voltar" }));
    expect(await screen.findByText("1 de 3 séries feitas")).toBeOnTheScreen();
    expect(mockBack).not.toHaveBeenCalled();

    await train();
    await fireEvent.press(await screen.findByRole("button", { name: "Ver todos" }));
    expect(await screen.findByText("1 de 3 séries feitas")).toBeOnTheScreen();

    await train();
    expect(mockPreventRemove?.prevent).toBe(true);
    await act(async () => mockPreventRemove?.callback({ data: { action: { type: "POP" } } }));
    expect(await screen.findByText("1 de 3 séries feitas")).toBeOnTheScreen();
    expect(mockPreventRemove?.prevent).toBe(false);
    expect(mockNavigation.dispatch).not.toHaveBeenCalled();
    expect(bff.calls.filter((c) => c.route === "GET /api/workouts/12/session")).toHaveLength(1);
  });

  it("leaves the overview with the session still in progress (R7)", async () => {
    bff = mockBff(routes(workout(), { "POST /api/workout-sessions/500/sets": setLog(11, "40") }));
    await renderScreen(<WorkoutSessionScreen />);
    await train();
    await fireEvent.press(await screen.findByRole("checkbox", { name: "Série 1 feita" }));
    await fireEvent.press(screen.getByRole("button", { name: "Ver todos" }));
    await fireEvent.press(await screen.findByRole("button", { name: "Voltar" }));
    expect(mockBack).toHaveBeenCalled();
    await waitFor(() => expect(readLocalSession()?.state.ticked[11]).toBe(true));
    expect(bff.calls.some((c) => c.route === "DELETE /api/workout-sessions/500")).toBe(false);
  });

  it("shows a workout finished this week with its note, no progress and “Refazer treino” (R19–R21)", async () => {
    const done = workout();
    bff = mockBff(routes(done, {}, [finishedLog(done)]));
    await renderScreen(<WorkoutSessionScreen />);
    expect(await screen.findByText("Concluído esta semana")).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "Refazer treino" })).toBeOnTheScreen();
    expect(screen.queryByText(/ de \d/)).toBeNull();
    expect(screen.queryByText(/Você já concluiu/)).toBeNull();
  });

  it("asks before redoing only when an exercise is opened; cancelling keeps the finished session (R22, E5)", async () => {
    const done = workout();
    bff = mockBff(routes(done, {}, [finishedLog(done)]));
    await renderScreen(<WorkoutSessionScreen />);
    await fireEvent.press(await screen.findByRole("button", { name: /^Exercício 2: Prancha/ }));
    expect(await screen.findByText(/Você já concluiu o “Treino B” nesta semana/)).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole("button", { name: "Cancelar" }));
    await waitFor(() => expect(screen.queryByText(/Você já concluiu/)).toBeNull());
    expect(screen.getByText("Concluído esta semana")).toBeOnTheScreen();
    expect(bff.calls.some((c) => c.route.startsWith("POST") || c.route === "GET /api/workouts/12/session")).toBe(false);
  });

  it("redoes a workout finished this week from the exercise picked", async () => {
    const done = workout();
    bff = mockBff(
      routes(done, { "POST /api/workouts/12/session/restart": { ...workout(), workoutLog: { ...workout().workoutLog, id: 501 } } }, [finishedLog(done)]),
    );
    await renderScreen(<WorkoutSessionScreen />);
    await fireEvent.press(await screen.findByRole("button", { name: /^Exercício 2: Prancha/ }));
    await fireEvent.press((await screen.findAllByRole("button", { name: "Refazer treino" })).at(-1)!);
    expect(await screen.findByRole("header", { name: "Prancha" })).toBeOnTheScreen();
  });

  it("offers the redo when a workout the logs had as not started turns out finished", async () => {
    const done = workout({ workoutLog: finishedLog(workout()) });
    bff = mockBff(routes(done, {}, []));
    await renderScreen(<WorkoutSessionScreen />);
    await fireEvent.press(await screen.findByRole("button", { name: "Começar treino" }));
    expect(await screen.findByText(/Você já concluiu o “Treino B” nesta semana/)).toBeOnTheScreen();
  });

  it("switches to another workout's overview with no confirmation before a session", async () => {
    jest.replaceProperty(Platform, "OS", "android");
    bff = mockBff(
      routes(workout(), {
        "GET /api/training-plans/1": {
          id: 1,
          workouts: [
            { id: 12, name: "Treino B", dayOfWeek: "WEDNESDAY" },
            { id: 13, name: "Treino C", dayOfWeek: "FRIDAY" },
          ],
        },
      }, []),
    );
    await renderScreen(<WorkoutSessionScreen />);
    await fireEvent.press(await screen.findByRole("button", { name: "Ações do treino" }));
    expect(screen.queryByRole("button", { name: "Descartar treino" })).toBeNull();
    await fireEvent.press(screen.getByRole("button", { name: "Trocar treino" }));
    await fireEvent.press(await screen.findByRole("button", { name: /Treino C/ }));
    expect(mockReplace).toHaveBeenCalledWith("/aluno/treino/13");
  });
});

describe("WorkoutSessionScreen", () => {
  it("opens on the first exercise with last time's weight, ticks a set and rests", async () => {
    bff = mockBff(routes(workout(), { "POST /api/workout-sessions/500/sets": setLog(11, "40") }));
    await renderScreen(<WorkoutSessionScreen />);
    await train();
    expect(await screen.findByRole("header", { name: "Remada" })).toBeOnTheScreen();
    expect(screen.getByText("EXERCÍCIO 1 DE 2")).toBeOnTheScreen();
    expect(screen.getByLabelText("Carga da série 1, em quilos").props.value).toBe("40");

    await fireEvent.press(screen.getByRole("checkbox", { name: "Série 1 feita" }));

    await waitFor(() => expect(bff.calls.find((c) => c.route === "POST /api/workout-sessions/500/sets")).toBeDefined());
    expect(bff.calls.find((c) => c.route === "POST /api/workout-sessions/500/sets")?.body).toEqual({ exerciseSetId: 11, weight: "40", reps: 12 });
    expect(screen.getByLabelText(/^Descanso: 1:00\./)).toBeOnTheScreen();
    await waitFor(() => expect(Notifications.scheduleNotificationAsync).toHaveBeenCalled());
  });

  it("explains the current set's strategy in its row, the others' from a sheet, and names it in the rest", async () => {
    bff = mockBff(
      routes(
        session([
          {
            id: 1,
            order: 1,
            name: "Remada",
            sets: [
              set(11, 1, { strategy: "DROPSET", notes: "Tire 10 kg duas vezes." }),
              set(12, 2, { strategy: "FAILURE", reps: 0 }),
              set(13, 3),
            ],
          },
        ]),
        { "POST /api/workout-sessions/500/sets": setLog(11, "") },
      ),
    );
    await renderScreen(<WorkoutSessionScreen />);
    await train();
    // The current set: the trainer's description, in the row.
    expect(await screen.findByText("Tire 10 kg duas vezes.")).toBeOnTheScreen();
    expect(screen.getByText("DROPSET")).toBeOnTheScreen();
    expect(screen.getByText("Orientação do seu treinador")).toBeOnTheScreen();
    // Another set: a row that says what it opens; a plain "Direta" set has none.
    expect(screen.getByRole("button", { name: "Série 2, Falha: como fazer" })).toBeOnTheScreen();
    expect(screen.queryByRole("button", { name: /Direta/ })).toBeNull();
    expect(screen.getByText("Até a falha")).toBeOnTheScreen();

    await fireEvent.press(screen.getByRole("button", { name: "Série 2, Falha: como fazer" }));
    expect(screen.getByText("SÉRIE 2 · ESTRATÉGIA")).toBeOnTheScreen();
    expect(screen.getByText("Faça repetições até não conseguir completar mais nenhuma com boa técnica.")).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole("button", { name: "Entendi" }));

    await fireEvent.press(screen.getByRole("checkbox", { name: "Série 1 feita" }));
    expect(await screen.findByLabelText(/Próxima: série 2 · Até a falha · Falha$/)).toBeOnTheScreen();
  });

  it("unticks a set", async () => {
    const resumed = workout();
    resumed.exercises[0].sets[0] = set(11, 1, { current: setLog(11, "40.00") });
    bff = mockBff(routes(resumed, { "DELETE /api/workout-sessions/500/sets/11": new Response(null, { status: 204 }) }));
    await renderScreen(<WorkoutSessionScreen />);
    await train();
    const tick = await screen.findByRole("checkbox", { name: "Série 1 feita" });
    expect(tick).toBeChecked();
    await fireEvent.press(tick);
    await waitFor(() => expect(bff.calls.some((c) => c.route === "DELETE /api/workout-sessions/500/sets/11")).toBe(true));
  });

  it("asks before finishing with sets left, then goes to the feedback step", async () => {
    const one = session([{ id: 1, order: 1, name: "Remada", sets: [set(11, 1), set(12, 2)] }]);
    bff = mockBff(
      routes(one, { "POST /api/workout-sessions/500/complete": { ...finishedLog(one), completedAt: "2026-10-21T11:00:00Z" } }),
    );
    await renderScreen(<WorkoutSessionScreen />);
    await train();
    await fireEvent.press(await screen.findByRole("button", { name: "Finalizar treino" }));
    expect(await screen.findByText(/Você ainda tem 2 séries não concluídas/)).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole("button", { name: "Finalizar mesmo assim" }));
    await waitFor(() =>
      expect(mockReplace).toHaveBeenCalledWith(
        expect.objectContaining({ pathname: "/aluno/treino/feedback/[logId]", params: expect.objectContaining({ logId: "500" }) }),
      ),
    );
  });

  it("skips feedback for a session the weekly rollover already finished", async () => {
    const one = session([{ id: 1, order: 1, name: "Remada", sets: [set(11, 1)] }]);
    bff = mockBff(
      routes(one, { "POST /api/workout-sessions/500/complete": { ...finishedLog(one), completionKind: "AUTO", completedAt: "2026-10-21T11:00:00Z" } }),
    );
    await renderScreen(<WorkoutSessionScreen />);
    await train();
    await fireEvent.press(await screen.findByRole("button", { name: "Finalizar treino" }));
    await fireEvent.press(await screen.findByRole("button", { name: "Finalizar mesmo assim" }));
    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith("/aluno"));
  });

  it("discards the session after a confirmation, from the exercise or the overview", async () => {
    // The action sheet runs its action on iOS's onDismiss, which doesn't fire under Jest.
    jest.replaceProperty(Platform, "OS", "android");
    bff = mockBff(routes(workout(), { "DELETE /api/workout-sessions/500": new Response(null, { status: 204 }) }));
    await renderScreen(<WorkoutSessionScreen />);
    await screen.findByRole("button", { name: "Continuar treino" });
    await fireEvent.press(screen.getByRole("button", { name: "Ações do treino" }));
    await fireEvent.press(screen.getByRole("button", { name: "Descartar treino" }));
    await act(async () => {});
    await fireEvent.press((await screen.findAllByRole("button", { name: "Descartar treino" })).at(-1)!);
    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith("/aluno"));
  });

  it("runs a hold: ticks the set when it ends", async () => {
    jest.useFakeTimers({ now: new Date("2026-10-21T10:00:00Z") });
    bff = mockBff(routes(workout(), { "POST /api/workout-sessions/500/sets": setLog(21, "") }));
    await renderScreen(<WorkoutSessionScreen />);
    await fireEvent.press(await screen.findByRole("button", { name: /^Exercício 2: Prancha/ }));
    await fireEvent.press(await screen.findByRole("button", { name: "Iniciar a série 1" }));
    expect(screen.getByLabelText("Segurando, faltam 0:30")).toBeOnTheScreen();
    await act(async () => {
      jest.advanceTimersByTime(30_500);
    });
    await waitFor(() => expect(bff.calls.find((c) => c.route === "POST /api/workout-sessions/500/sets")?.body).toEqual({ exerciseSetId: 21, weight: "", reps: 0 }));
  });

  it("finishes only after the last set's save has landed", async () => {
    let land: (() => void) | undefined;
    const one = session([{ id: 1, order: 1, name: "Remada", sets: [set(11, 1)] }]);
    bff = mockBff(
      routes(one, {
        "POST /api/workout-sessions/500/sets": () => new Promise<Response>((resolve) => (land = () => resolve(Response.json(setLog(11, ""))))),
        "POST /api/workout-sessions/500/complete": { ...finishedLog(one), completedAt: "2026-10-21T11:00:00Z" },
      }),
    );
    await renderScreen(<WorkoutSessionScreen />);
    await train();
    await fireEvent.press(await screen.findByRole("checkbox", { name: "Série 1 feita" }));
    await fireEvent.press(screen.getByRole("button", { name: "Finalizar treino" }));
    await act(async () => {});
    expect(bff.calls.some((c) => c.route === "POST /api/workout-sessions/500/complete")).toBe(false);
    await act(async () => land?.());
    await waitFor(() =>
      expect(bff.calls.map((c) => c.route).filter((r) => r.startsWith("POST"))).toEqual([
        "POST /api/workout-sessions/500/sets",
        "POST /api/workout-sessions/500/complete",
      ]),
    );
  });

  it("doesn't hold the finish on a set the API refused for good (the rollover closed the session)", async () => {
    const one = session([{ id: 1, order: 1, name: "Remada", sets: [set(11, 1)] }]);
    bff = mockBff(
      routes(one, {
        "POST /api/workout-sessions/500/sets": bffError(409, "PRECONDITION_FAILED"),
        "POST /api/workout-sessions/500/complete": { ...finishedLog(one), completionKind: "AUTO", completedAt: "2026-10-26T03:05:00Z" },
      }),
    );
    await renderScreen(<WorkoutSessionScreen />);
    await train();
    await fireEvent.press(await screen.findByRole("checkbox", { name: "Série 1 feita" }));
    await waitFor(() => expect(bff.calls.some((c) => c.route === "POST /api/workout-sessions/500/sets")).toBe(true));
    await act(async () => {});
    await fireEvent.press(screen.getByRole("button", { name: "Finalizar treino" }));
    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith("/aluno"));
    expect(bff.calls.filter((c) => c.route === "POST /api/workout-sessions/500/sets")).toHaveLength(1);
  });

  it("says when the API refuses the finish (no dialog to show it with every set ticked)", async () => {
    const one = session([{ id: 1, order: 1, name: "Remada", sets: [set(11, 1)] }]);
    bff = mockBff(
      routes(one, {
        "POST /api/workout-sessions/500/sets": setLog(11, ""),
        "POST /api/workout-sessions/500/complete": bffError(409, "PRECONDITION_FAILED"),
      }),
    );
    await renderScreen(<WorkoutSessionScreen />);
    await train();
    await fireEvent.press(await screen.findByRole("checkbox", { name: "Série 1 feita" }));
    await fireEvent.press(screen.getByRole("button", { name: "Finalizar treino" }));
    await waitFor(() => expect(bff.calls.at(-1)?.route).toBe("POST /api/workout-sessions/500/complete"));
    expect(
      await screen.findByText(apiErrorMessage(new ApiError({ code: "PRECONDITION_FAILED", message: "" }, 409), "Não foi possível finalizar. Tente novamente.")),
    ).toBeOnTheScreen();
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it("trains offline: ticks wait in the outbox, the banner says so, finishing goes on, all is sent on reconnect (R56–R58)", async () => {
    const one = session([{ id: 1, order: 1, name: "Remada", sets: [set(11, 1)] }]);
    bff = mockBff(
      routes(one, {
        "POST /api/workout-sessions/500/sets": setLog(11, ""),
        "POST /api/workout-sessions/500/complete": { ...finishedLog(one), completedAt: "2026-10-21T11:00:00Z" },
      }),
    );
    await renderScreen(<WorkoutSessionScreen />);
    await train();
    await screen.findByRole("checkbox", { name: "Série 1 feita" });
    const opened = bff.calls.length;
    await act(async () => onlineManager.setOnline(false));
    expect(screen.getByText("Sem conexão. Seu treino será enviado quando a conexão voltar.")).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole("checkbox", { name: "Série 1 feita" }));
    await fireEvent.press(screen.getByRole("button", { name: "Finalizar treino" }));
    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith(expect.objectContaining({ pathname: "/aluno/treino/feedback/[logId]" })));
    expect(bff.calls).toHaveLength(opened);
    await act(async () => onlineManager.setOnline(true));
    await waitFor(() =>
      expect(bff.calls.map((c) => c.route).filter((r) => r.startsWith("POST"))).toEqual([
        "POST /api/workout-sessions/500/sets",
        "POST /api/workout-sessions/500/complete",
      ]),
    );
  });

  it("reopens the session kept on the device while offline, on its overview", async () => {
    bff = mockBff(routes(workout(), { "POST /api/workout-sessions/500/sets": setLog(11, "45") }));
    const first = await renderScreen(<WorkoutSessionScreen />);
    await train();
    await fireEvent.changeText(await screen.findByLabelText("Carga da série 1, em quilos"), "45");
    await fireEvent.press(screen.getByRole("checkbox", { name: "Série 1 feita" }));
    await first.unmount();

    await act(async () => onlineManager.setOnline(false));
    await renderScreen(<WorkoutSessionScreen />);
    expect(await screen.findByText("1 de 3 séries feitas")).toBeOnTheScreen();
    await train();
    expect(await screen.findByRole("checkbox", { name: "Série 1 feita" })).toBeChecked();
    expect(screen.getByLabelText("Carga da série 1, em quilos").props.value).toBe("45");
  });

  it("never resumes a session kept from an earlier week (the rollover closed it)", async () => {
    const old = workout();
    old.workoutLog = { ...old.workoutLog, weekStartDate: "2020-01-06" };
    saveLocalSession({ workoutId: 12, logId: 500, state: initSession(old), sent: {} });
    bff = mockBff(routes(workout()));
    onlineManager.setOnline(false);
    await renderScreen(<WorkoutSessionScreen />);
    expect(await screen.findByText("Sem conexão")).toBeOnTheScreen();
    expect(readLocalSession()).toBeNull();
  });

  it("never resumes offline a kept session whose finish is still queued", async () => {
    saveLocalSession({ workoutId: 12, logId: 500, state: initSession(workout()), sent: {} });
    bff = mockBff(routes(workout()));
    onlineManager.setOnline(false);
    enqueue({ kind: "complete", logId: 500, workoutId: 12 });
    await renderScreen(<WorkoutSessionScreen />);
    expect(await screen.findByText("Sem conexão")).toBeOnTheScreen();
    expect(readLocalSession()).toBeNull();
  });

  it("drops the kept session when the server's week has another one in progress", async () => {
    saveLocalSession({ workoutId: 12, logId: 499, state: initSession({ ...workout(), workoutLog: { ...workout().workoutLog, id: 499 } }), sent: {} });
    bff = mockBff(routes(workout()));
    await renderScreen(<WorkoutSessionScreen />);
    await waitFor(() => expect(bff.calls.some((c) => c.route === "GET /api/workouts/12/session")).toBe(true));
    await train();
    expect(await screen.findByRole("header", { name: "Remada" })).toBeOnTheScreen();
    await waitFor(() => expect(readLocalSession()?.logId).toBe(500));
  });

  it("drops the kept session when the week has it no more (finished or discarded elsewhere)", async () => {
    saveLocalSession({ workoutId: 12, logId: 500, state: initSession(workout()), sent: {} });
    bff = mockBff(routes(workout(), {}, []));
    await renderScreen(<WorkoutSessionScreen />);
    expect(await screen.findByRole("button", { name: "Começar treino" })).toBeOnTheScreen();
    expect(readLocalSession()).toBeNull();
    expect(bff.calls.some((c) => c.route === "GET /api/workouts/12/session")).toBe(false);
  });

  it("keeps the kept session when the week's refetch fails over a cached week without it", async () => {
    saveLocalSession({ workoutId: 12, logId: 500, state: initSession(workout()), sent: {} });
    const client = testQueryClient();
    client.setQueryData(workoutLogsQueryKey(1, weekStartOf(todayLocalIso())), []);
    bff = mockBff(routes(workout(), { "GET /api/workout-logs": bffError(500, "INTERNAL") }));
    await renderScreen(<WorkoutSessionScreen />, client);
    await waitFor(() => expect(bff.calls.some((c) => c.route === "GET /api/workout-logs")).toBe(true));
    await act(async () => {});
    expect(screen.getByRole("button", { name: "Continuar treino" })).toBeOnTheScreen();
    expect(readLocalSession()?.logId).toBe(500);
  });

  it("starts nothing when the week's refetch fails over a cached week showing it in progress (R4)", async () => {
    const client = testQueryClient();
    client.setQueryData(workoutLogsQueryKey(1, weekStartOf(todayLocalIso())), [workout().workoutLog]);
    bff = mockBff(routes(workout(), { "GET /api/workout-logs": bffError(500, "INTERNAL") }));
    await renderScreen(<WorkoutSessionScreen />, client);
    await waitFor(() => expect(bff.calls.some((c) => c.route === "GET /api/workout-logs")).toBe(true));
    await act(async () => {});
    expect(bff.calls.some((c) => c.route === "GET /api/workouts/12/session")).toBe(false);
  });

  it("doesn't open the kept session when the server refuses the workout (a 404: it's gone)", async () => {
    saveLocalSession({ workoutId: 12, logId: 500, state: initSession(workout()), sent: {} });
    bff = mockBff({ "GET /api/workouts/12/full": bffError(404, "NOT_FOUND") });
    await renderScreen(<WorkoutSessionScreen />);
    expect(await screen.findByRole("button", { name: /Tentar/ })).toBeOnTheScreen();
    expect(screen.queryByText("Continuar treino")).toBeNull();
    expect(readLocalSession()).toBeNull();
  });

  it("waits for a finish of the same workout still in the queue before opening it again", async () => {
    jest.useFakeTimers();
    bff = mockBff(routes(workout(), { "POST /api/workout-sessions/500/complete": bffError(503, "UNAVAILABLE") }));
    enqueue({ kind: "complete", logId: 500, workoutId: 12 });
    await renderScreen(<WorkoutSessionScreen />);
    // The week still has it in progress (the finish hasn't landed): opening it waits on the queue.
    await waitFor(() => expect(bff.calls.some((c) => c.route === "GET /api/workout-logs")).toBe(true));
    await act(async () => {
      await jest.advanceTimersByTimeAsync(6_000);
    });
    expect(screen.getByText("Enviando seu último treino")).toBeOnTheScreen();
    expect(bff.calls.some((c) => c.route === "GET /api/workouts/12/session")).toBe(false);
  });

  it("can't open a workout never opened on this device without a connection (R55, E28)", async () => {
    bff = mockBff(routes(workout()));
    onlineManager.setOnline(false);
    await renderScreen(<WorkoutSessionScreen />);
    expect(await screen.findByText("Sem conexão")).toBeOnTheScreen();
    expect(bff.calls).toEqual([]);
  });

  it("keeps an untick and a quick re-tick of the same set in order", async () => {
    let landDelete: (() => void) | undefined;
    const resumed = workout();
    resumed.exercises[0].sets[0] = set(11, 1, { current: setLog(11, "40.00") });
    bff = mockBff(
      routes(resumed, {
        "DELETE /api/workout-sessions/500/sets/11": () => new Promise<Response>((resolve) => (landDelete = () => resolve(new Response(null, { status: 204 })))),
        "POST /api/workout-sessions/500/sets": setLog(11, "40"),
      }),
    );
    await renderScreen(<WorkoutSessionScreen />);
    await train();
    const tick = await screen.findByRole("checkbox", { name: "Série 1 feita" });
    await fireEvent.press(tick);
    await fireEvent.press(tick);
    await act(async () => {});
    expect(bff.calls.some((c) => c.route === "POST /api/workout-sessions/500/sets")).toBe(false);
    await act(async () => landDelete?.());
    await waitFor(() => expect(bff.calls.at(-1)?.route).toBe("POST /api/workout-sessions/500/sets"));
  });

  it("schedules the rest's notification, cancels it on the next tick, and alerts when the rest ends live", async () => {
    jest.useFakeTimers({ now: new Date("2026-10-21T10:00:00Z") });
    const three = session([{ id: 1, order: 1, name: "Remada", sets: [set(11, 1), set(12, 2), set(13, 3)] }]);
    bff = mockBff(routes(three, { "POST /api/workout-sessions/500/sets": setLog(11, "40") }));
    await renderScreen(<WorkoutSessionScreen />);
    await train();
    await fireEvent.press(await screen.findByRole("checkbox", { name: "Série 1 feita" }));
    await waitFor(() =>
      expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledWith(
        expect.objectContaining({ trigger: expect.objectContaining({ seconds: 60 }) }),
      ),
    );
    await act(async () => {
      jest.advanceTimersByTime(60_250);
    });
    expect(Vibration.vibrate).toHaveBeenCalledTimes(1);

    await fireEvent.press(screen.getByRole("checkbox", { name: "Série 2 feita" }));
    await waitFor(() => expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledTimes(2));
    await fireEvent.press(screen.getByRole("checkbox", { name: "Série 3 feita" }));
    await waitFor(() => expect(Notifications.cancelScheduledNotificationAsync).toHaveBeenCalledWith("notification-id"));
  });

  it("moves past an unfinished exercise, which stays open, and finishes from the only one left", async () => {
    bff = mockBff(routes(workout(), { "POST /api/workout-sessions/500/sets": setLog(21, "") }));
    await renderScreen(<WorkoutSessionScreen />);
    await train();
    await screen.findByRole("header", { name: "Remada" });
    await fireEvent.press(screen.getByRole("button", { name: "Próximo exercício" }));
    expect(screen.getByRole("header", { name: "Prancha" })).toBeOnTheScreen();
    expect(screen.getByText("EXERCÍCIO 2 DE 2")).toBeOnTheScreen();
    expect(bff.calls.some((c) => c.route === "POST /api/workout-sessions/500/sets")).toBe(false);

    await fireEvent.press(screen.getByRole("button", { name: "Próximo exercício" }));
    expect(screen.getByRole("header", { name: "Remada" })).toBeOnTheScreen();
    expect(screen.getByRole("checkbox", { name: "Série 1 feita" })).not.toBeChecked();
  });

  it("goes to the next exercise after the last set, with no rest or notification (R26)", async () => {
    bff = mockBff(routes(workout(), { "POST /api/workout-sessions/500/sets": setLog(11, "40") }));
    await renderScreen(<WorkoutSessionScreen />);
    await train();
    await fireEvent.press(await screen.findByRole("checkbox", { name: "Série 1 feita" }));
    expect(screen.getByLabelText(/^Descanso:/)).toBeOnTheScreen();
    await waitFor(() => expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledTimes(1));

    await fireEvent.press(screen.getByRole("checkbox", { name: "Série 2 feita" }));
    expect(screen.getByRole("header", { name: "Prancha" })).toBeOnTheScreen();
    expect(screen.queryByLabelText(/^Descanso:/)).toBeNull();
    await act(async () => {});
    expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledTimes(1);
  });

  it("shows the check when an exercise is done, naming the next one, and not on a set before it", async () => {
    jest.useFakeTimers({ now: new Date("2026-10-21T10:00:00Z") });
    bff = mockBff(routes(workout(), { "POST /api/workout-sessions/500/sets": setLog(11, "40") }));
    await renderScreen(<WorkoutSessionScreen />);
    await train();
    await fireEvent.press(await screen.findByRole("checkbox", { name: "Série 1 feita" }));
    expect(screen.queryByTestId("exercise-done-check")).toBeNull();
    expect(Haptics.impactAsync).not.toHaveBeenCalled();

    await fireEvent.press(screen.getByRole("checkbox", { name: "Série 2 feita" }));
    expect(screen.getByTestId("exercise-done-check")).toBeOnTheScreen();
    expect(screen.getByLabelText("Exercício concluído. Próximo: Prancha.")).toBeOnTheScreen();
    expect(Haptics.impactAsync).toHaveBeenCalledTimes(1);
    await act(async () => {
      jest.advanceTimersByTime(EXERCISE_DONE_MS);
    });
    expect(screen.queryByTestId("exercise-done-check")).toBeNull();
  });

  it("shows the check again when a set of a finished exercise is unticked and ticked back", async () => {
    jest.useFakeTimers({ now: new Date("2026-10-21T10:00:00Z") });
    bff = mockBff(
      routes(workout(), {
        "POST /api/workout-sessions/500/sets": setLog(11, "40"),
        "DELETE /api/workout-sessions/500/sets/12": {},
      }),
    );
    await renderScreen(<WorkoutSessionScreen />);
    await train();
    await fireEvent.press(await screen.findByRole("checkbox", { name: "Série 1 feita" }));
    await fireEvent.press(screen.getByRole("checkbox", { name: "Série 2 feita" }));
    await act(async () => {
      jest.advanceTimersByTime(EXERCISE_DONE_MS);
    });
    await fireEvent.press(screen.getByRole("button", { name: "Exercício anterior" }));
    await fireEvent.press(screen.getByRole("checkbox", { name: "Série 2 feita" }));
    expect(screen.queryByTestId("exercise-done-check")).toBeNull();
    await fireEvent.press(screen.getByRole("checkbox", { name: "Série 2 feita" }));
    expect(screen.getByTestId("exercise-done-check")).toBeOnTheScreen();
    expect(Haptics.impactAsync).toHaveBeenCalledTimes(2);
  });

  it("shows no check for sets already done when the session reopens", async () => {
    const done = workout();
    done.exercises[0].sets = done.exercises[0].sets.map((s) => ({ ...s, current: setLog(s.id, "40") }));
    bff = mockBff(routes(done));
    await renderScreen(<WorkoutSessionScreen />);
    await train();
    await screen.findByRole("header", { name: "Prancha" });
    expect(screen.queryByTestId("exercise-done-check")).toBeNull();
  });

  it("closes a sheet about the exercise when a hold behind it moves on", async () => {
    jest.useFakeTimers({ now: new Date("2026-10-21T10:00:00Z") });
    const hold = set(11, 1, { reps: 0, durationSeconds: 30, strategy: "ISOMETRIC_HOLD" });
    bff = mockBff(
      routes(
        session([
          { id: 1, order: 1, name: "Prancha", sets: [hold] },
          { id: 2, order: 2, name: "Remada", sets: [set(21, 1)] },
        ]),
        { "POST /api/workout-sessions/500/sets": setLog(11, ""), "GET /api/exercises/1/progress": [] },
      ),
    );
    await renderScreen(<WorkoutSessionScreen />);
    await train();
    await fireEvent.press(await screen.findByRole("button", { name: "Iniciar a série 1" }));
    await fireEvent.press(screen.getByRole("button", { name: "Ver progresso" }));
    expect(screen.getByLabelText("Progresso · Prancha")).toBeOnTheScreen();
    await act(async () => {
      jest.advanceTimersByTime(30_250);
    });
    expect(screen.getByRole("header", { name: "Remada" })).toBeOnTheScreen();
    expect(screen.queryByLabelText("Progresso · Prancha")).toBeNull();
  });

  it("stays put after the workout's last set, offering to finish", async () => {
    const single = session([{ id: 1, order: 1, name: "Remada", sets: [set(11, 1)] }]);
    bff = mockBff(routes(single, { "POST /api/workout-sessions/500/sets": setLog(11, "") }));
    await renderScreen(<WorkoutSessionScreen />);
    await train();
    await fireEvent.press(await screen.findByRole("checkbox", { name: "Série 1 feita" }));
    expect(screen.getByRole("header", { name: "Remada" })).toBeOnTheScreen();
    expect(screen.queryByLabelText(/^Descanso:/)).toBeNull();
    expect(screen.getByRole("button", { name: "Finalizar treino" })).toBeOnTheScreen();
  });

  it("offers to finish, with the confirmation, on the only exercise still open", async () => {
    const single = session([{ id: 1, order: 1, name: "Remada", sets: [set(11, 1)] }]);
    bff = mockBff(routes(single));
    await renderScreen(<WorkoutSessionScreen />);
    await train();
    await screen.findByRole("header", { name: "Remada" });
    expect(screen.queryByRole("button", { name: "Próximo exercício" })).toBeNull();
    await fireEvent.press(screen.getByRole("button", { name: "Finalizar treino" }));
    expect(await screen.findByText(/Você ainda tem 1 série não concluída/)).toBeOnTheScreen();
  });

  it("gives no in-app alert for a rest that ended while the app was away", async () => {
    jest.useFakeTimers({ now: new Date("2026-10-21T10:00:00Z") });
    bff = mockBff(routes(workout(), { "POST /api/workout-sessions/500/sets": setLog(11, "40") }));
    await renderScreen(<WorkoutSessionScreen />);
    await train();
    await fireEvent.press(await screen.findByRole("checkbox", { name: "Série 1 feita" }));
    appState.currentState = "background";
    await act(async () => {
      jest.advanceTimersByTime(61_000);
    });
    expect(Vibration.vibrate).not.toHaveBeenCalled();
    expect(screen.queryByLabelText(/^Descanso:/)).toBeNull();
  });

  it("stops a hold whose weight is invalid instead of retrying it", async () => {
    jest.useFakeTimers({ now: new Date("2026-10-21T10:00:00Z") });
    bff = mockBff(routes(workout()));
    await renderScreen(<WorkoutSessionScreen />);
    await fireEvent.press(await screen.findByRole("button", { name: /^Exercício 2: Prancha/ }));
    await fireEvent.changeText(await screen.findByLabelText("Carga da série 1, em quilos"), "1000");
    await fireEvent.press(screen.getByRole("button", { name: "Iniciar a série 1" }));
    await act(async () => {
      jest.advanceTimersByTime(32_000);
    });
    expect(screen.getAllByText(/Carga inválida/)).toHaveLength(1);
    expect(screen.getByRole("button", { name: "Iniciar a série 1" })).toBeOnTheScreen();
  });

  it("shows the error state when the session can't open", async () => {
    bff = mockBff(routes(workout(), { "GET /api/workouts/12/session": bffError(500, "INTERNAL") }));
    await renderScreen(<WorkoutSessionScreen />);
    expect(await screen.findByRole("button", { name: /Tentar/ })).toBeOnTheScreen();
  });
});
