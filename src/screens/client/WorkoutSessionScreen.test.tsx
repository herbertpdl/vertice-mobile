import { act, fireEvent, screen, waitFor } from "@testing-library/react-native";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

import type { WorkoutSession } from "@/lib/api/types";
import { session, set, setLog } from "@/lib/workoutSession/fixtures";
import { bffError, mockBff, type BffMock } from "@/test/bff";
import { renderScreen } from "@/test/render";

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

let bff: BffMock;
afterEach(() => {
  bff?.restore();
  jest.clearAllMocks();
  jest.useRealTimers();
});

describe("setHint", () => {
  it("prefers the trainer's note, then last time's weight, then the trainer's load", () => {
    expect(setHint(set(1, 1, { notes: "Segure 1 s" }))).toBe("Segure 1 s");
    expect(setHint(set(1, 1, { lastPerformed: setLog(1, "42.50") }))).toBe("Última vez: 42,5 kg");
    expect(setHint(set(1, 1, { weight: "40" }))).toBe("Carga sugerida 40 kg");
    expect(setHint(set(1, 1))).toBeUndefined();
  });
});

describe("WorkoutSessionScreen", () => {
  it("opens on the first exercise with last time's weight, ticks a set and rests", async () => {
    bff = mockBff({ "GET /api/workouts/12/session": workout(), "POST /api/workout-sessions/500/sets": setLog(11, "40") });
    await renderScreen(<WorkoutSessionScreen />);
    expect(await screen.findByRole("header", { name: "Remada" })).toBeOnTheScreen();
    expect(screen.getByText("EXERCÍCIO 1 DE 2")).toBeOnTheScreen();
    expect(screen.getByLabelText("Carga da série 1, em quilos").props.value).toBe("40");

    await fireEvent.press(screen.getByRole("checkbox", { name: "Série 1 feita" }));

    await waitFor(() => expect(bff.calls.find((c) => c.route === "POST /api/workout-sessions/500/sets")).toBeDefined());
    expect(bff.calls.find((c) => c.route === "POST /api/workout-sessions/500/sets")?.body).toEqual({ exerciseSetId: 11, weight: "40", reps: 12 });
    expect(screen.getByLabelText(/^Descanso: 1:00\./)).toBeOnTheScreen();
    await waitFor(() => expect(Notifications.scheduleNotificationAsync).toHaveBeenCalled());
  });

  it("unticks a set", async () => {
    const resumed = workout();
    resumed.exercises[0].sets[0] = set(11, 1, { current: setLog(11, "40.00") });
    bff = mockBff({ "GET /api/workouts/12/session": resumed, "DELETE /api/workout-sessions/500/sets/11": new Response(null, { status: 204 }) });
    await renderScreen(<WorkoutSessionScreen />);
    const tick = await screen.findByRole("checkbox", { name: "Série 1 feita" });
    expect(tick).toBeChecked();
    await fireEvent.press(tick);
    await waitFor(() => expect(bff.calls.some((c) => c.route === "DELETE /api/workout-sessions/500/sets/11")).toBe(true));
  });

  it("asks before finishing with sets left, then goes to the feedback step", async () => {
    bff = mockBff({
      "GET /api/workouts/12/session": workout(),
      "POST /api/workout-sessions/500/complete": { ...workout().workoutLog, status: "COMPLETED", completionKind: "CLIENT", completedAt: "2026-10-21T11:00:00Z" },
    });
    await renderScreen(<WorkoutSessionScreen />);
    await fireEvent.press(await screen.findByRole("button", { name: "Ver todos" }));
    await fireEvent.press(screen.getByRole("button", { name: "Finalizar treino" }));
    expect(await screen.findByText(/Você ainda tem 3 séries não concluídas/)).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole("button", { name: "Finalizar mesmo assim" }));
    await waitFor(() =>
      expect(mockReplace).toHaveBeenCalledWith(
        expect.objectContaining({ pathname: "/aluno/treino/feedback/[logId]", params: expect.objectContaining({ logId: "500" }) }),
      ),
    );
  });

  it("skips feedback for a session the weekly rollover already finished", async () => {
    bff = mockBff({
      "GET /api/workouts/12/session": workout(),
      "POST /api/workout-sessions/500/complete": { ...workout().workoutLog, status: "COMPLETED", completionKind: "AUTO", completedAt: "2026-10-21T11:00:00Z" },
    });
    await renderScreen(<WorkoutSessionScreen />);
    await fireEvent.press(await screen.findByRole("button", { name: "Ver todos" }));
    await fireEvent.press(screen.getByRole("button", { name: "Finalizar treino" }));
    await fireEvent.press(await screen.findByRole("button", { name: "Finalizar mesmo assim" }));
    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith("/aluno"));
  });

  it("offers a redo of a workout finished this week, then opens the new session", async () => {
    const done = workout({ workoutLog: { ...workout().workoutLog, status: "COMPLETED", completionKind: "CLIENT", completedAt: "2026-10-20T11:00:00Z" } });
    bff = mockBff({ "GET /api/workouts/12/session": done, "POST /api/workouts/12/session/restart": { ...workout(), workoutLog: { ...workout().workoutLog, id: 501 } } });
    await renderScreen(<WorkoutSessionScreen />);
    expect(await screen.findByText(/Você já concluiu o “Treino B” nesta semana/)).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole("button", { name: "Refazer treino" }));
    expect(await screen.findByRole("header", { name: "Remada" })).toBeOnTheScreen();
  });

  it("discards the session after a confirmation", async () => {
    // The action sheet runs its action on iOS's onDismiss, which doesn't fire under Jest.
    jest.replaceProperty(Platform, "OS", "android");
    bff = mockBff({ "GET /api/workouts/12/session": workout(), "DELETE /api/workout-sessions/500": new Response(null, { status: 204 }) });
    await renderScreen(<WorkoutSessionScreen />);
    await fireEvent.press(await screen.findByRole("button", { name: "Ações do treino" }));
    await fireEvent.press(screen.getByRole("button", { name: "Descartar treino" }));
    await act(async () => {});
    await fireEvent.press((await screen.findAllByRole("button", { name: "Descartar treino" })).at(-1)!);
    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith("/aluno"));
  });

  it("runs a hold: ticks the set when it ends", async () => {
    jest.useFakeTimers({ now: new Date("2026-10-21T10:00:00Z") });
    bff = mockBff({ "GET /api/workouts/12/session": workout(), "POST /api/workout-sessions/500/sets": setLog(21, "") });
    await renderScreen(<WorkoutSessionScreen />);
    await fireEvent.press(await screen.findByRole("button", { name: "Ver todos" }));
    await fireEvent.press(screen.getByRole("button", { name: /^Exercício 2: Prancha/ }));
    await fireEvent.press(screen.getByRole("button", { name: "Iniciar a série 1" }));
    expect(screen.getByLabelText("Segurando, faltam 0:30")).toBeOnTheScreen();
    await act(async () => {
      jest.advanceTimersByTime(30_500);
    });
    await waitFor(() => expect(bff.calls.find((c) => c.route === "POST /api/workout-sessions/500/sets")?.body).toEqual({ exerciseSetId: 21, weight: "", reps: 0 }));
  });

  it("shows the error state when the session can't open", async () => {
    bff = mockBff({ "GET /api/workouts/12/session": bffError(500, "INTERNAL") });
    await renderScreen(<WorkoutSessionScreen />);
    expect(await screen.findByRole("button", { name: /Tentar/ })).toBeOnTheScreen();
  });
});
