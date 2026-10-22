import { apiClient, type ApiRequestInit } from "./client";
import type { WorkoutLog } from "./types";

type Signal = Pick<ApiRequestInit, "signal">;

/**
 * The client's workout sessions (logs): which workouts of a plan were started or finished in a
 * week. A CLIENT's own logs — the BFF ignores `clientId` for them.
 */
export function workoutLogsQueryKey(trainingPlanId: number, weekStartDate: string) {
  return ["workoutLogs", { trainingPlanId, weekStartDate }] as const;
}

/** Every week's logs of every plan start with this: invalidate it after any session change. */
export const workoutLogsQueryPrefix = ["workoutLogs"] as const;

export function fetchWorkoutLogs(trainingPlanId: number, weekStartDate: string, init?: Signal) {
  return apiClient.get<WorkoutLog[]>("/api/workout-logs", { trainingPlanId, weekStartDate }, init);
}
