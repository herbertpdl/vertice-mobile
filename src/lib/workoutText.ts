import type { ExerciseSet, FullWorkoutExercise } from "@/lib/api/types";
import { SET_STRATEGIES, SET_STRATEGY_DESCRIPTIONS } from "@/lib/labels";

/**
 * How a prescribed set and exercise read on the client's screens ("12 reps · Direta",
 * "4 séries · 12 a 8 reps · 60 s"). Weights stay decimal strings ("do not round-trip through a
 * float"): only the separator changes, to the pt-BR comma.
 */

/** "42.5" → "42,5"; "" stays "". */
export function weightText(weight: string): string {
  return weight.replace(".", ",");
}

/** Rests and holds as the trainer thinks of them: 60 → "60 s", 90 → "90 s", 150 → "2:30". */
export function durationText(seconds: number): string {
  if (seconds < 120) return `${seconds} s`;
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

/** A set is timed (a hold) when the trainer prescribed a duration instead of reps. */
export function isTimed(set: Pick<ExerciseSet, "durationSeconds">): boolean {
  return set.durationSeconds > 0;
}

/** What to do: "12 reps", "30 s", "Até a falha" (reps 0 on a failure/AMRAP set). */
export function setGoal(set: Pick<ExerciseSet, "reps" | "durationSeconds" | "strategy">): string {
  if (isTimed(set)) return durationText(set.durationSeconds);
  if (set.reps > 0) return `${set.reps} reps`;
  return set.strategy === "AMRAP" ? "Máximo de reps" : "Até a falha";
}

/** The set's line: "12 reps · Direta", "30 s · Isometria". */
export function setTarget(set: Pick<ExerciseSet, "reps" | "durationSeconds" | "strategy">): string {
  return `${setGoal(set)} · ${SET_STRATEGIES[set.strategy]}`;
}

/** What a set's strategy row explains: its name and how to do it. */
export type StrategyGuide = {
  /** "Dropset". */
  name: string;
  /** The trainer's description (the set's notes), else the strategy's own. */
  text: string;
  /** `text` is the trainer's. */
  fromTrainer: boolean;
};

/**
 * The guide for a set, or null for a plain "Direta" set with nothing from the trainer: only a set
 * with something to explain gets a strategy row.
 */
export function strategyGuide(set: Pick<ExerciseSet, "strategy" | "notes">): StrategyGuide | null {
  const note = set.notes.trim();
  if (set.strategy === "STRAIGHT" && note === "") return null;
  return {
    name: SET_STRATEGIES[set.strategy],
    text: note === "" ? SET_STRATEGY_DESCRIPTIONS[set.strategy] : note,
    fromTrainer: note !== "",
  };
}

/** The rest timer's caption for the set that comes next: "Próxima: série 3 · 10 reps · Dropset". */
export function nextSetText(set: Pick<ExerciseSet, "setNumber" | "reps" | "durationSeconds" | "strategy">): string {
  const strategy = set.strategy === "STRAIGHT" ? "" : ` · ${SET_STRATEGIES[set.strategy]}`;
  return `Próxima: série ${set.setNumber} · ${setGoal(set)}${strategy}`;
}

/** The trainer's suggestion for a set: "Carga sugerida 40 kg", "70% da carga máxima", or "". */
export function prescribedLoad(set: Pick<ExerciseSet, "weight" | "loadPercentage">): string {
  if (set.weight !== "") return `Carga sugerida ${weightText(set.weight)} kg`;
  if (set.loadPercentage !== "") return `${weightText(set.loadPercentage)}% da carga máxima`;
  return "";
}

/** The rest after a set: its own, else the exercise's between-sets rest (PRD R45). */
export function restSecondsFor(set: Pick<ExerciseSet, "restSeconds">, exercise: Pick<FullWorkoutExercise, "restSecondsBetweenSets">): number {
  return set.restSeconds > 0 ? set.restSeconds : exercise.restSecondsBetweenSets;
}

/** The exercise's line: "4 séries · 12 a 8 reps · 60 s", "3 séries · 30 s · 45 s". */
export function exerciseSummary(exercise: Pick<FullWorkoutExercise, "sets" | "restSecondsBetweenSets">): string {
  const { sets } = exercise;
  const parts = [`${sets.length} ${sets.length === 1 ? "série" : "séries"}`];
  if (sets.length > 0) {
    const goals = [...new Set(sets.map(setGoal))];
    const reps = sets.filter((s) => !isTimed(s) && s.reps > 0).map((s) => s.reps);
    if (goals.length === 1) parts.push(goals[0]);
    else if (reps.length === sets.length) parts.push(`${Math.max(...reps)} a ${Math.min(...reps)} reps`);
    else parts.push(goals.join(" / "));
    const rest = restSecondsFor(sets[0], exercise);
    if (rest > 0) parts.push(`${durationText(rest)} de descanso`);
  }
  return parts.join(" · ");
}
