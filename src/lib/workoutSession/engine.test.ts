import {
  clockText,
  currentSetId,
  initSession,
  initialWeight,
  inputToWeight,
  onLastOpenExercise,
  overviewMain,
  overviewRows,
  pendingSets,
  secondsLeft,
  sessionReducer,
  stepRows,
  timerProgress,
  weightToInput,
  type SessionState,
} from "./engine";
import { session, set, setLog } from "./fixtures";

const NOW = 1_000_000;

/** Two exercises listed out of order: "Remada" (order 1, two sets) and "Prancha" (order 2, a 30 s hold). */
const snapshot = () =>
  session([
    { id: 2, order: 2, name: "Prancha", sets: [set(21, 1, { reps: 0, durationSeconds: 30, strategy: "ISOMETRIC_HOLD", restSeconds: 0 })], rest: 45 },
    { id: 1, order: 1, name: "Remada", sets: [set(12, 2), set(11, 1, { restSeconds: 0 })], rest: 90 },
  ]);

describe("weights", () => {
  it("shows API decimals the way the field does, and back", () => {
    expect(weightToInput("90.00")).toBe("90");
    expect(weightToInput("42.50")).toBe("42,5");
    expect(weightToInput("")).toBe("");
    expect(inputToWeight("42,5")).toBe("42.5");
    expect(inputToWeight(" 90 ")).toBe("90");
    expect(inputToWeight("")).toBe("");
    expect(inputToWeight("1000")).toBeNull();
    expect(inputToWeight("4,555")).toBeNull();
    expect(inputToWeight("abc")).toBeNull();
  });

  it("starts from this session, else last time, else the trainer's (R35, R36)", () => {
    expect(initialWeight(set(1, 1, { current: setLog(1, "50.00"), lastPerformed: setLog(1, "45.00"), weight: "40" }))).toBe("50");
    expect(initialWeight(set(1, 1, { lastPerformed: setLog(1, "45.00"), weight: "40" }))).toBe("45");
    expect(initialWeight(set(1, 1, { lastPerformed: setLog(1, ""), weight: "40" }))).toBe("40");
    expect(initialWeight(set(1, 1))).toBe("");
  });
});

describe("sessionReducer", () => {
  it("opens on the first exercise in the trainer's order, its first set current", () => {
    const state = initSession(snapshot());
    expect(state.exerciseIndex).toBe(0);
    expect(currentSetId(state)).toBe(11);
    expect(pendingSets(state)).toBe(3);
  });

  it("resumes: sets this session recorded are ticked, and it opens where the client stopped", () => {
    const resumed = snapshot();
    resumed.exercises[1].sets = [set(12, 2, { current: setLog(12, "40.00") }), set(11, 1, { current: setLog(11, "40.00") })];
    const state = initSession(resumed);
    expect(state.exerciseIndex).toBe(1);
    expect(state.weights[12]).toBe("40");
  });

  it("ticks a set and starts its rest, the set's own or else the exercise's (R45, R46)", () => {
    let state = initSession(snapshot());
    state = sessionReducer(state, { type: "tick", setId: 11, now: NOW });
    expect(state.rest).toEqual({ setId: 11, startedAt: NOW, endsAt: NOW + 90_000 });
    expect(currentSetId(state)).toBe(12);
    const other = sessionReducer(initSession(snapshot()), { type: "tick", setId: 12, now: NOW + 5000 });
    expect(other.rest).toEqual({ setId: 12, startedAt: NOW + 5000, endsAt: NOW + 65_000 });
  });

  it("ends the running rest when another set is ticked or the exercise changes (R48)", () => {
    let state = sessionReducer(initSession(snapshot()), { type: "tick", setId: 11, now: NOW });
    state = sessionReducer(state, { type: "goTo", index: 1 });
    expect(state.rest).toBeNull();
  });

  it("unticks a set until the session ends (R38)", () => {
    let state = sessionReducer(initSession(snapshot()), { type: "tick", setId: 11, now: NOW });
    state = sessionReducer(state, { type: "untick", setId: 11 });
    expect(state.ticked[11]).toBeUndefined();
    expect(state.rest).toBeNull();
  });

  describe("completing an exercise (R46a)", () => {
    const three = () =>
      session([
        { id: 1, order: 1, name: "Remada", sets: [set(11, 1), set(12, 2)] },
        { id: 2, order: 2, name: "Prancha", sets: [set(21, 1, { reps: 0, durationSeconds: 30, strategy: "ISOMETRIC_HOLD" }), set(22, 2, { reps: 0, durationSeconds: 30, strategy: "ISOMETRIC_HOLD" })] },
        { id: 3, order: 3, name: "Agachamento", sets: [set(31, 1)] },
      ]);
    const tickAll = (state: SessionState, ids: number[]) => ids.reduce((s, setId) => sessionReducer(s, { type: "tick", setId, now: NOW }), state);

    it("rests between sets, then moves on without a rest after the last one", () => {
      const first = tickAll(initSession(three()), [11]);
      expect(first.rest).not.toBeNull();
      expect(first.exerciseIndex).toBe(0);
      const done = tickAll(first, [12]);
      expect(done.rest).toBeNull();
      expect(done.exerciseIndex).toBe(1);
    });

    it("counts the set that completes it, whichever its position", () => {
      const done = tickAll(initSession(three()), [12, 11]);
      expect(done.rest).toBeNull();
      expect(done.exerciseIndex).toBe(1);
    });

    it("moves on from a timed set the same way", () => {
      let state = sessionReducer(tickAll(initSession(three()), [11, 12, 21]), { type: "startHold", setId: 22, now: NOW });
      state = sessionReducer(state, { type: "holdEnded", now: NOW + 30_000 });
      expect(state.hold).toBeNull();
      expect(state.rest).toBeNull();
      expect(state.exerciseIndex).toBe(2);
    });

    it("goes back to an exercise skipped earlier", () => {
      const state = tickAll(sessionReducer(initSession(three()), { type: "goTo", index: 2 }), [31]);
      expect(state.exerciseIndex).toBe(0);
    });

    it("moves on again when a set of a finished exercise is unticked and ticked back", () => {
      let state = sessionReducer(tickAll(initSession(three()), [11, 12]), { type: "goTo", index: 0 });
      state = sessionReducer(state, { type: "untick", setId: 12 });
      state = sessionReducer(state, { type: "tick", setId: 12, now: NOW });
      expect(state.rest).toBeNull();
      expect(state.exerciseIndex).toBe(1);
    });

    it("does nothing else on the last open exercise: no rest, no move", () => {
      const state = tickAll(initSession(three()), [11, 12, 21, 22, 31]);
      expect(state.rest).toBeNull();
      expect(state.exerciseIndex).toBe(2);
      expect(pendingSets(state)).toBe(0);
    });
  });

  describe("next (R39)", () => {
    /** Three exercises of one set each, except the first with two. */
    const three = () =>
      session([
        { id: 1, order: 1, name: "Remada", sets: [set(11, 1), set(12, 2)] },
        { id: 2, order: 2, name: "Supino", sets: [set(21, 1)] },
        { id: 3, order: 3, name: "Agachamento", sets: [set(31, 1)] },
      ]);

    it("moves on from an unfinished exercise, ticking nothing", () => {
      let state = sessionReducer(initSession(three()), { type: "tick", setId: 11, now: NOW });
      state = sessionReducer(state, { type: "next" });
      expect(state.exerciseIndex).toBe(1);
      expect(state.ticked).toEqual({ 11: true });
      expect(stepRows(state).map((r) => r.state)).toEqual(["pending", "current", "pending"]);
    });

    it("skips an exercise already done", () => {
      let state = sessionReducer(initSession(three()), { type: "goTo", index: 1 });
      state = sessionReducer(state, { type: "tick", setId: 21, now: NOW });
      state = sessionReducer(state, { type: "goTo", index: 0 });
      state = sessionReducer(state, { type: "next" });
      expect(state.exerciseIndex).toBe(2);
    });

    it("wraps to an exercise skipped earlier", () => {
      let state = sessionReducer(initSession(three()), { type: "goTo", index: 2 });
      state = sessionReducer(state, { type: "next" });
      expect(state.exerciseIndex).toBe(0);
    });

    it("stays on the only open exercise, where the button finishes instead (R40)", () => {
      let state = initSession(three());
      expect(onLastOpenExercise(state)).toBe(false);
      for (const id of [21, 31]) state = sessionReducer(state, { type: "tick", setId: id, now: NOW });
      expect(onLastOpenExercise(state)).toBe(true);
      expect(sessionReducer(state, { type: "next" }).exerciseIndex).toBe(0);
    });

    it("ends the running rest", () => {
      let state = sessionReducer(initSession(three()), { type: "tick", setId: 11, now: NOW });
      state = sessionReducer(state, { type: "next" });
      expect(state.rest).toBeNull();
    });
  });

  it("runs a hold, ticks the set when it ends, then rests (R52, R53)", () => {
    const hold = { reps: 0, durationSeconds: 30, strategy: "ISOMETRIC_HOLD" } as const;
    let state = initSession(session([{ id: 2, order: 1, name: "Prancha", sets: [set(21, 1, hold), set(22, 2, hold)], rest: 45 }]));
    state = sessionReducer(state, { type: "startHold", setId: 21, now: NOW });
    expect(state.hold).toEqual({ setId: 21, startedAt: NOW, endsAt: NOW + 30_000 });
    state = sessionReducer(state, { type: "holdEnded", now: NOW + 30_000 });
    expect(state.ticked[21]).toBe(true);
    expect(state.hold).toBeNull();
    expect(state.rest).toEqual({ setId: 21, startedAt: NOW + 30_000, endsAt: NOW + 90_000 });
  });

  it("ignores a hold on a set without a duration", () => {
    const state = initSession(snapshot());
    expect(sessionReducer(state, { type: "startHold", setId: 11, now: NOW })).toBe(state);
  });

  it("knows when every set is done (R40)", () => {
    let state = initSession(snapshot());
    for (const id of [11, 12, 21]) state = sessionReducer(state, { type: "tick", setId: id, now: NOW });
    expect(pendingSets(state)).toBe(0);
    expect(onLastOpenExercise(state)).toBe(true);
    expect(stepRows(state).map((r) => r.state)).toEqual(["done", "done"]);
  });

  it("lists the steps with their progress (R41)", () => {
    const state = sessionReducer(initSession(snapshot()), { type: "tick", setId: 11, now: NOW });
    expect(stepRows(state)).toEqual([
      { index: 0, name: "Remada", done: 1, total: 2, state: "current" },
      { index: 1, name: "Prancha", done: 0, total: 1, state: "pending" },
    ]);
  });
});

describe("timers", () => {
  it("counts down from the end time, never below zero", () => {
    const timer = { setId: 1, startedAt: NOW, endsAt: NOW + 60_000 };
    expect(secondsLeft(timer, NOW + 13_200)).toBe(47);
    expect(secondsLeft(timer, NOW + 90_000)).toBe(0);
    expect(timerProgress(timer, NOW + 30_000)).toBe(0.5);
    expect(clockText(47)).toBe("0:47");
    expect(clockText(90)).toBe("1:30");
  });
});

describe("workout overview", () => {
  it("opens a new session on the exercise picked, else on the first open one", () => {
    expect(initSession(snapshot(), 1).exerciseIndex).toBe(1);
    expect(initSession(snapshot()).exerciseIndex).toBe(0);
    expect(initSession(snapshot(), 7).exerciseIndex).toBe(0);
  });

  it("continues at the first exercise with a set left, then finishes (R16, R17)", () => {
    let state = initSession(snapshot(), 1);
    expect(overviewMain(state)).toEqual({ kind: "continue", index: 0 });
    state = sessionReducer(state, { type: "tick", setId: 11, now: NOW });
    state = sessionReducer(state, { type: "tick", setId: 12, now: NOW });
    expect(overviewMain(state)).toEqual({ kind: "continue", index: 1 });
    state = sessionReducer(state, { type: "tick", setId: 21, now: NOW });
    expect(overviewMain(state)).toEqual({ kind: "finish" });
  });

  it("lists the exercises in the trainer's order, without progress before a session (R8–R13)", () => {
    const s = snapshot();
    s.exercises[0].exercise = { ...s.exercises[0].exercise, videoUrl: "https://youtu.be/dQw4w9WgXcQ", muscleGroups: [{ id: 3, name: "Abdômen" }] };
    const rows = overviewRows(s.exercises);
    expect(rows.map((r) => [r.index, r.name, r.setsText])).toEqual([
      [0, "Remada", "2 séries · 12 reps"],
      [1, "Prancha", "1 × 30 s"],
    ]);
    expect(rows[1]).toMatchObject({ hasVideo: true, muscleGroups: ["Abdômen"], thumbnail: "https://img.youtube.com/vi/dQw4w9WgXcQ/hqdefault.jpg" });
    expect(rows[0]).toMatchObject({ hasVideo: false, thumbnail: null, progress: undefined });
  });

  it("counts each exercise's ticks and marks the one the client is on, until it's done", () => {
    let state = initSession(snapshot());
    state = sessionReducer(state, { type: "tick", setId: 11, now: NOW });
    const progress = (st: SessionState) => overviewRows(st.snapshot.exercises, st).map((r) => r.progress);
    expect(progress(state)).toEqual([
      { done: 1, total: 2, current: true },
      { done: 0, total: 1, current: false },
    ]);
    state = sessionReducer(state, { type: "tick", setId: 12, now: NOW });
    expect(progress(state)).toEqual([
      { done: 2, total: 2, current: false },
      { done: 0, total: 1, current: true },
    ]);
  });
});
