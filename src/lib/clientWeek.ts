import { addDays, dayOfWeekOf } from "@/lib/calendar";
import { DAY_ORDER } from "@/lib/labels";
import type { DayOfWeek, Workout, WorkoutLog } from "@/lib/api/types";

/**
 * The client's week on Início (PRD R6, R8, R13–R15): which weekdays are done, what the main
 * button does today. Pure functions over the plan's workouts and this week's logs — business dates
 * only, "today" passed in — so they test without a clock or a zone.
 */

export type ClientDayState = "done" | "today" | "pending" | "rest";

export type ClientWeekDay = { day: DayOfWeek; date: string; state: ClientDayState };

/** A finished session (the week list never carries a superseded one). */
export function isFinished(log: WorkoutLog): boolean {
  return log.status === "COMPLETED";
}

/** The workouts finished this week, by id. */
function finishedIds(logs: WorkoutLog[]): Set<number> {
  return new Set(logs.filter(isFinished).map((log) => log.workoutId));
}

/**
 * Monday → Sunday. A day is done when one of that weekday's workouts was finished this week (the
 * day the workout belongs to, not the day it was done on); today is "today" unless done; a day
 * with workouts is pending, one without is rest.
 */
export function clientWeek(workouts: Workout[], logs: WorkoutLog[], weekStart: string, today: string): ClientWeekDay[] {
  const finished = finishedIds(logs);
  return DAY_ORDER.map((day, i) => {
    const date = addDays(weekStart, i);
    const ofDay = workouts.filter((w) => w.dayOfWeek === day);
    const done = ofDay.some((w) => finished.has(w.id));
    const state: ClientDayState = done ? "done" : date === today ? "today" : ofDay.length > 0 ? "pending" : "rest";
    return { day, date, state };
  });
}

/** How many of the plan's workouts were finished this week. */
export function finishedCount(workouts: Workout[], logs: WorkoutLog[]): number {
  const finished = finishedIds(logs);
  return workouts.filter((w) => finished.has(w.id)).length;
}

/** The week's session that was started and not finished, if any (the most recently started). */
export function inProgressLog(logs: WorkoutLog[]): WorkoutLog | undefined {
  return logs
    .filter((log) => log.status === "IN_PROGRESS")
    .reduce<WorkoutLog | undefined>((latest, log) => (latest === undefined || log.startedAt > latest.startedAt ? log : latest), undefined);
}

/**
 * What Início's main button does (R8, R13–R15):
 * - `continue`: a session is in progress this week — resume it;
 * - `start`: exactly one workout today, with exercises, not finished — open it;
 * - `done`: every workout of today is finished — offer another ("Treinar outro treino");
 * - `pick`: no workout today, or several unfinished ones — open the picker (`today` limits it to them);
 * - `empty`: the plan has no workouts — the button is disabled (R7).
 */
export type HomeAction =
  | { kind: "continue"; log: WorkoutLog }
  | { kind: "start"; workout: Workout }
  | { kind: "done"; workouts: Workout[] }
  | { kind: "pick"; today: Workout[] }
  | { kind: "empty" };

export function homeAction(
  workouts: Workout[],
  logs: WorkoutLog[],
  today: string,
  /** Exercises per workout id; a workout with none can't be started (R17). Missing = unknown. */
  exerciseCounts: ReadonlyMap<number, number>,
): HomeAction {
  if (workouts.length === 0) return { kind: "empty" };
  const running = inProgressLog(logs);
  if (running !== undefined) return { kind: "continue", log: running };

  const finished = finishedIds(logs);
  const ofToday = workouts.filter((w) => w.dayOfWeek === dayOfWeekOf(today));
  if (ofToday.length > 0 && ofToday.every((w) => finished.has(w.id))) return { kind: "done", workouts: ofToday };
  const open = ofToday.filter((w) => !finished.has(w.id));
  if (open.length === 1 && (exerciseCounts.get(open[0].id) ?? 1) > 0) return { kind: "start", workout: open[0] };
  return { kind: "pick", today: open };
}
