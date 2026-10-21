import { ApiError } from "@/lib/api/client";
import type { Exercise, FullWorkout, WorkoutExerciseEntry } from "@/lib/api/types";

import { createAutosaveEngine, type AutosaveTransport } from "./autosave";
import { emptyWorkout, fromFullWorkout, rekeyFrom } from "./model";

const supino: Exercise = { id: 1, name: "Supino Reto", description: "", videoUrl: "", muscleGroups: [{ id: 1, name: "Peito" }], isStarter: true };

const full: FullWorkout = {
  id: 5,
  name: "Treino A",
  trainingPlanId: 7,
  dayOfWeek: "MONDAY",
  exercises: [
    {
      id: 50,
      workoutId: 5,
      exerciseId: 1,
      order: 1,
      restSecondsBetweenSets: 60,
      notes: "",
      exercise: supino,
      sets: [
        { id: 500, workoutExerciseId: 50, setNumber: 1, reps: 12, durationSeconds: 0, weight: "40.00", loadPercentage: "", strategy: "STRAIGHT", restSeconds: 60, notes: "" },
        { id: 501, workoutExerciseId: 50, setNumber: 2, reps: 10, durationSeconds: 0, weight: "42.50", loadPercentage: "", strategy: "STRAIGHT", restSeconds: 60, notes: "" },
      ],
    },
  ],
};

function transport() {
  const mocks = {
    create: jest.fn(async (_planId: number, input: { name: string }) => ({ ...full, id: 9, name: input.name, exercises: [] })),
    getFull: jest.fn(async () => full),
    replace: jest.fn(async (_workoutId: number, _exercises: WorkoutExerciseEntry[]) => full),
    patchWorkout: jest.fn(async () => ({})),
    addExercise: jest.fn(async () => ({ id: 60 })),
    updateExercise: jest.fn(async () => ({})),
    deleteExercise: jest.fn(async () => undefined),
    addSet: jest.fn(async () => ({ id: 600 })),
    updateSet: jest.fn(async () => ({})),
    deleteSet: jest.fn(async () => undefined),
  } satisfies AutosaveTransport;
  return mocks;
}

function manual(t = transport()) {
  const engine = createAutosaveEngine({ planId: 7, workoutId: 5, initial: fromFullWorkout(full), transport: t, delayMs: null });
  return { engine, t };
}

describe("the engine with saving left to the trainer (delayMs: null)", () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it("only marks the draft dirty on an edit: nothing is sent, however long it waits", async () => {
    const { engine, t } = manual();
    expect(engine.getState().dirty).toBe(false);
    engine.dispatch({ type: "setName", name: "Treino A — Peito" });
    await jest.advanceTimersByTimeAsync(60_000);
    expect(engine.getState()).toMatchObject({ dirty: true, status: "idle" });
    expect(t.patchWorkout).not.toHaveBeenCalled();
  });

  it("is clean again when an edit is undone by hand", () => {
    const { engine } = manual();
    engine.dispatch({ type: "setName", name: "Treino B" });
    engine.dispatch({ type: "setName", name: "Treino A" });
    expect(engine.getState().dirty).toBe(false);
  });

  it("saves on finish(): header PATCH and the whole-tree PUT, then clean", async () => {
    const { engine, t } = manual();
    const exerciseKey = engine.getState().draft.exercises[0].key;
    engine.dispatch({ type: "setName", name: "Treino A — Peito" });
    engine.dispatch({ type: "addSet", exerciseKey });
    expect(await engine.finish()).toBe(true);
    expect(t.patchWorkout).toHaveBeenCalledWith(5, { name: "Treino A — Peito", dayOfWeek: "MONDAY" });
    expect(t.replace).toHaveBeenCalledTimes(1);
    expect(t.replace.mock.calls[0][1][0].sets).toHaveLength(3);
    expect(engine.getState()).toMatchObject({ dirty: false, status: "saved" });
  });

  it("creates a new workout in one nested POST on finish()", async () => {
    const t = transport();
    const engine = createAutosaveEngine({ planId: 7, workoutId: null, initial: emptyWorkout("TUESDAY"), transport: t, delayMs: null });
    engine.dispatch({ type: "addExercise", exercise: supino });
    expect(t.create).not.toHaveBeenCalled();
    await engine.finish();
    expect(t.create).toHaveBeenCalledWith(7, {
      name: "Novo treino",
      dayOfWeek: "TUESDAY",
      exercises: [{ exerciseId: 1, restSecondsBetweenSets: 60, notes: "", sets: [] }],
    });
    expect(engine.getState().workoutId).toBe(9);
  });

  it("keeps a failed save's error through later edits, until the next attempt", async () => {
    const t = transport();
    t.patchWorkout.mockRejectedValueOnce(new ApiError({ code: "UPSTREAM_UNAVAILABLE", message: "down" }, 503));
    const { engine } = manual(t);
    engine.dispatch({ type: "setName", name: "Treino B" });
    expect(await engine.finish()).toBe(false);
    engine.dispatch({ type: "setName", name: "Treino C" });
    expect(engine.getState()).toMatchObject({ status: "error", dirty: true });
    expect(await engine.finish()).toBe(true);
    expect(t.patchWorkout).toHaveBeenLastCalledWith(5, { name: "Treino C", dayOfWeek: "MONDAY" });
  });

  it("rests after a save that an edit made during it left dirty (no stuck \"saving\")", async () => {
    const { engine } = manual();
    engine.dispatch({ type: "setName", name: "Treino B" });
    const saving = engine.finish();
    engine.dispatch({ type: "setName", name: "Treino C" });
    await saving;
    expect(engine.getState()).toMatchObject({ status: "saved", dirty: true });
  });

  it("discard() puts back what the server last confirmed", async () => {
    const { engine } = manual();
    engine.dispatch({ type: "setName", name: "Treino B" });
    await engine.finish();
    engine.dispatch({ type: "setName", name: "Treino C" });
    engine.dispatch({ type: "removeExercise", exerciseKey: engine.getState().draft.exercises[0].key });
    engine.discard();
    expect(engine.getState().draft.name).toBe("Treino B");
    expect(engine.getState().draft.exercises).toHaveLength(1);
    expect(engine.getState().dirty).toBe(false);
  });

  it("names a refused removal without promising an autosave", async () => {
    const t = transport();
    t.replace.mockRejectedValue(new ApiError({ code: "PRECONDITION_FAILED", message: "recorded" }, 409));
    t.deleteSet.mockRejectedValue(new ApiError({ code: "PRECONDITION_FAILED", message: "recorded" }, 409));
    const { engine } = manual(t);
    const we = engine.getState().draft.exercises[0];
    engine.dispatch({ type: "removeSet", exerciseKey: we.key, setKey: we.sets[1].key });
    await engine.finish();
    const { refusal, draft, dirty } = engine.getState();
    expect(refusal?.body).toContain("O restante do treino foi salvo.");
    expect(refusal?.body).not.toContain("automaticamente");
    expect(draft.exercises[0].sets).toHaveLength(2);
    expect(dirty).toBe(false);
  });
});

describe("rekeyFrom", () => {
  it("adopts the fresh tree's keys for items it still has, and re-adds the ones it lost", () => {
    const earlier = fromFullWorkout(full);
    const edited = {
      ...earlier,
      exercises: [{ ...earlier.exercises[0], notes: "Cadência", sets: [{ ...earlier.exercises[0].sets[0], reps: 8 }, earlier.exercises[0].sets[1]] }],
    };
    const gone = { ...full, exercises: [{ ...full.exercises[0], sets: [full.exercises[0].sets[0]] }] };
    const base = fromFullWorkout(gone);
    const rekeyed = rekeyFrom(edited, base);
    const [we] = rekeyed.exercises;
    expect(we).toMatchObject({ key: base.exercises[0].key, id: 50, notes: "Cadência" });
    expect(we.sets[0]).toMatchObject({ key: base.exercises[0].sets[0].key, id: 500, reps: 8 });
    expect(we.sets[1]).toMatchObject({ id: null, setNumber: undefined, reps: 10 });
    expect(we.sets[1].key).not.toBe(edited.exercises[0].sets[1].key);
  });
});
