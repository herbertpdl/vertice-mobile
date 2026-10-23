import {
  allTicked,
  clockText,
  currentSetId,
  initSession,
  initialWeight,
  inputToWeight,
  pendingSets,
  secondsLeft,
  sessionReducer,
  stepRows,
  timerProgress,
  weightToInput,
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
    state = sessionReducer(state, { type: "tick", setId: 12, now: NOW + 5000 });
    expect(state.rest).toEqual({ setId: 12, startedAt: NOW + 5000, endsAt: NOW + 65_000 });
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

  it("moves to the first exercise, in order, with a set left (R39)", () => {
    let state = sessionReducer(initSession(snapshot()), { type: "goTo", index: 1 });
    state = sessionReducer(state, { type: "tick", setId: 21, now: NOW });
    state = sessionReducer(state, { type: "next" });
    expect(state.exerciseIndex).toBe(0);
  });

  it("runs a hold, ticks the set when it ends, then rests (R52, R53)", () => {
    let state = sessionReducer(initSession(snapshot()), { type: "goTo", index: 1 });
    state = sessionReducer(state, { type: "startHold", setId: 21, now: NOW });
    expect(state.hold).toEqual({ setId: 21, startedAt: NOW, endsAt: NOW + 30_000 });
    state = sessionReducer(state, { type: "holdEnded", now: NOW + 30_000 });
    expect(state.ticked[21]).toBe(true);
    expect(state.hold).toBeNull();
    expect(state.rest).toEqual({ setId: 21, startedAt: NOW + 30_000, endsAt: NOW + 75_000 });
  });

  it("ignores a hold on a set without a duration", () => {
    const state = initSession(snapshot());
    expect(sessionReducer(state, { type: "startHold", setId: 11, now: NOW })).toBe(state);
  });

  it("knows when every set is done (R40)", () => {
    let state = initSession(snapshot());
    for (const id of [11, 12, 21]) state = sessionReducer(state, { type: "tick", setId: id, now: NOW });
    expect(allTicked(state)).toBe(true);
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
