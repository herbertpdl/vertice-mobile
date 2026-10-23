import type { WorkoutSession, WorkoutSessionExercise, WorkoutSessionSet } from "@/lib/api/types";
import { isTimed, restSecondsFor } from "@/lib/workoutText";

/**
 * The workout session as the client trains it (client spec §3.3, PRD R30–R54): a pure reducer and
 * selectors over the session snapshot taken when it opened (R29: trainer edits made meanwhile apply
 * next time). No React, no I/O, no clock: every action that needs the time takes `now` (epoch ms).
 */

export type Timer = { setId: number; startedAt: number; endsAt: number };

export type SessionState = {
  snapshot: WorkoutSession;
  /** Ticked sets, by exercise set id. */
  ticked: Record<number, true>;
  /** The weight field's pt-BR text per set (`""` = none), ticked or not. */
  weights: Record<number, string>;
  exerciseIndex: number;
  rest: Timer | null;
  hold: Timer | null;
};

export type SessionAction =
  | { type: "tick"; setId: number; now: number }
  | { type: "untick"; setId: number }
  | { type: "setWeight"; setId: number; text: string }
  | { type: "goTo"; index: number }
  | { type: "next" }
  | { type: "startHold"; setId: number; now: number }
  | { type: "stopHold" }
  | { type: "holdEnded"; now: number }
  | { type: "restEnded" };

/** Exercises in the trainer's order, each one's sets by number. */
export function orderedExercises(snapshot: WorkoutSession): WorkoutSessionExercise[] {
  return [...snapshot.exercises]
    .sort((a, b) => a.order - b.order)
    .map((exercise) => ({ ...exercise, sets: [...exercise.sets].sort((a, b) => a.setNumber - b.setNumber) }));
}

// ---- weights ------------------------------------------------------------------------------------

/** A decimal string from the API ("90.00", "42.5") as the field shows it: "90", "42,5". */
export function weightToInput(weight: string): string {
  if (weight === "") return "";
  const [whole, fraction = ""] = weight.split(".");
  const trimmed = fraction.replace(/0+$/, "");
  return trimmed === "" ? whole : `${whole},${trimmed}`;
}

/** The field's text as the API takes it ("42,5" → "42.5"), or null when it isn't a valid weight. */
export function inputToWeight(text: string): string | null {
  const value = text.trim().replace(",", ".");
  if (value === "") return "";
  if (!/^\d{1,3}(\.\d{1,2})?$/.test(value)) return null;
  return value;
}

/** What the weight field starts with (R35, R36): this session's, else last time's, else the trainer's. */
export function initialWeight(set: WorkoutSessionSet): string {
  if (set.current !== null) return weightToInput(set.current.weight);
  if (set.lastPerformed !== null && set.lastPerformed.weight !== "") return weightToInput(set.lastPerformed.weight);
  return weightToInput(set.weight);
}

// ---- state --------------------------------------------------------------------------------------

/** The first exercise, in order, with a set not ticked yet (R39); the last one when all are. */
function firstOpenIndex(exercises: WorkoutSessionExercise[], ticked: Record<number, true>): number {
  const index = exercises.findIndex((exercise) => exercise.sets.some((set) => !ticked[set.id]));
  return index === -1 ? Math.max(0, exercises.length - 1) : index;
}

export function initSession(snapshot: WorkoutSession): SessionState {
  const exercises = orderedExercises(snapshot);
  const ticked: Record<number, true> = {};
  const weights: Record<number, string> = {};
  for (const exercise of exercises) {
    for (const set of exercise.sets) {
      if (set.current !== null) ticked[set.id] = true;
      weights[set.id] = initialWeight(set);
    }
  }
  return { snapshot, ticked, weights, exerciseIndex: firstOpenIndex(exercises, ticked), rest: null, hold: null };
}

function findSet(state: SessionState, setId: number) {
  for (const exercise of state.snapshot.exercises) {
    const set = exercise.sets.find((s) => s.id === setId);
    if (set !== undefined) return { exercise, set };
  }
  return undefined;
}

/** Ticks a set and starts its rest (none when the rest is 0): R45, R46, R48. */
function tick(state: SessionState, setId: number, now: number): SessionState {
  const found = findSet(state, setId);
  if (found === undefined) return state;
  const rest = restSecondsFor(found.set, found.exercise);
  return {
    ...state,
    ticked: { ...state.ticked, [setId]: true },
    hold: null,
    rest: rest > 0 ? { setId, startedAt: now, endsAt: now + rest * 1000 } : null,
  };
}

export function sessionReducer(state: SessionState, action: SessionAction): SessionState {
  switch (action.type) {
    case "tick":
      return tick(state, action.setId, action.now);
    case "untick": {
      const { [action.setId]: _removed, ...ticked } = state.ticked;
      return { ...state, ticked, rest: state.rest?.setId === action.setId ? null : state.rest };
    }
    case "setWeight":
      return { ...state, weights: { ...state.weights, [action.setId]: action.text } };
    case "goTo":
      return { ...state, exerciseIndex: action.index, rest: null, hold: null };
    case "next":
      return {
        ...state,
        exerciseIndex: firstOpenIndex(orderedExercises(state.snapshot), state.ticked),
        rest: null,
        hold: null,
      };
    case "startHold": {
      const found = findSet(state, action.setId);
      if (found === undefined || !isTimed(found.set)) return state;
      return {
        ...state,
        rest: null,
        hold: { setId: action.setId, startedAt: action.now, endsAt: action.now + found.set.durationSeconds * 1000 },
      };
    }
    case "stopHold":
      return { ...state, hold: null };
    case "holdEnded":
      return state.hold === null ? state : tick(state, state.hold.setId, action.now);
    case "restEnded":
      return { ...state, rest: null };
  }
}

// ---- selectors ----------------------------------------------------------------------------------

export function currentExercise(state: SessionState): WorkoutSessionExercise | undefined {
  return orderedExercises(state.snapshot)[state.exerciseIndex];
}

/** The set the client is on: the first not ticked of the current exercise. */
export function currentSetId(state: SessionState): number | undefined {
  return currentExercise(state)?.sets.find((set) => !state.ticked[set.id])?.id;
}

export function totalSets(state: SessionState): number {
  return state.snapshot.exercises.reduce((total, exercise) => total + exercise.sets.length, 0);
}

/** Sets not ticked yet (the R43 confirmation's count). */
export function pendingSets(state: SessionState): number {
  return totalSets(state) - Object.keys(state.ticked).length;
}

/** Every set is ticked: "Próximo" becomes "Finalizar treino" (R40). */
export function allTicked(state: SessionState): boolean {
  return pendingSets(state) === 0;
}

export type StepRow = { index: number; name: string; done: number; total: number; state: "pending" | "current" | "done" };

/** The "Ver todos" rows (R41). */
export function stepRows(state: SessionState): StepRow[] {
  return orderedExercises(state.snapshot).map((exercise, index) => {
    const done = exercise.sets.filter((set) => state.ticked[set.id]).length;
    const total = exercise.sets.length;
    return {
      index,
      name: exercise.exercise.name,
      done,
      total,
      state: done === total && total > 0 ? "done" : index === state.exerciseIndex ? "current" : "pending",
    };
  });
}

/** Whole seconds left on a timer at `now` (never negative). */
export function secondsLeft(timer: Timer, now: number): number {
  return Math.max(0, Math.ceil((timer.endsAt - now) / 1000));
}

/** Share of the timer already run, 0–1. */
export function timerProgress(timer: Timer, now: number): number {
  const span = timer.endsAt - timer.startedAt;
  return span <= 0 ? 1 : Math.min(1, Math.max(0, (now - timer.startedAt) / span));
}

/** "0:47". */
export function clockText(seconds: number): string {
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}
