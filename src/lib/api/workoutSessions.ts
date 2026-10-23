import { apiClient, type ApiRequestInit } from "./client";
import type { SetLog, WorkoutLog, WorkoutSession } from "./types";

type Signal = Pick<ApiRequestInit, "signal">;

/**
 * The client's workout sessions (logs): which workouts of a plan were started or finished in a
 * week, and the "do a workout" aggregate. A CLIENT's own — the BFF ignores `clientId` for them.
 */
export function workoutLogsQueryKey(trainingPlanId: number, weekStartDate: string) {
  return ["workoutLogs", { trainingPlanId, weekStartDate }] as const;
}

/** Every week's logs of every plan start with this: invalidate it after any session change. */
export const workoutLogsQueryPrefix = ["workoutLogs"] as const;

export function fetchWorkoutLogs(trainingPlanId: number, weekStartDate: string, init?: Signal) {
  return apiClient.get<WorkoutLog[]>("/api/workout-logs", { trainingPlanId, weekStartDate }, init);
}

/** One workout's session this week (it starts one on first open: never fetch it just to look). */
export function workoutSessionQueryKey(workoutId: number) {
  return ["workoutSession", workoutId] as const;
}

/**
 * `GET /workouts/{id}/session`: resumes the week's session in progress, else returns the week's
 * completed one (`workoutLog.status === "COMPLETED"` — offer a redo), else starts one.
 */
export function fetchWorkoutSession(workoutId: number, init?: Signal) {
  return apiClient.get<WorkoutSession>(`/api/workouts/${workoutId}/session`, undefined, init);
}

/** A redo of the week's finished workout: replaces it only once finished (PRD R20–R23). */
export function restartWorkoutSession(workoutId: number) {
  return apiClient.post<WorkoutSession>(`/api/workouts/${workoutId}/session/restart`);
}

/** Ticks a set (or re-records its weight); `weight` `""` is none. */
export function recordSetLog(workoutLogId: number, input: { exerciseSetId: number; weight: string; reps: number }) {
  return apiClient.post<SetLog>(`/api/workout-sessions/${workoutLogId}/sets`, input);
}

/** Unticks a set (R38). */
export function deleteSetLog(workoutLogId: number, exerciseSetId: number) {
  return apiClient.delete<void>(`/api/workout-sessions/${workoutLogId}/sets/${exerciseSetId}`);
}

export function completeWorkoutLog(workoutLogId: number) {
  return apiClient.post<WorkoutLog>(`/api/workout-sessions/${workoutLogId}/complete`);
}

/** Deletes a session in progress (R19, R26). */
export function discardWorkoutLog(workoutLogId: number) {
  return apiClient.delete<void>(`/api/workout-sessions/${workoutLogId}`);
}
