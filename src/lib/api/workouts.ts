import { apiClient, type ApiRequestInit } from "./client";
import type { components } from "./schema";
import type {
  Workout,
  FullWorkout,
  RecentWorkoutSummary,
  WorkoutExerciseEntry,
} from "./types";

export function fetchRecentWorkouts() {
  return apiClient.get<RecentWorkoutSummary[]>("/api/workouts", { recent: "true" });
}

export function fetchWorkouts(planId: number) {
  return apiClient.get<Workout[]>(`/api/training-plans/${planId}/workouts`);
}

export type WorkoutInput = components["schemas"]["WorkoutRequest"];

/** `WorkoutInput` plus the optional nested tree; omitted or `[]` creates an empty workout. Max 20. */
export type WorkoutCreateInput = components["schemas"]["CreateWorkoutRequest"];

/** Creates the workout and (optionally) its whole exercise/set tree in one call; returns the full tree with every new id. */
export function createWorkout(planId: number, input: WorkoutCreateInput) {
  return apiClient.post<FullWorkout>(`/api/training-plans/${planId}/workouts`, input);
}

export function fetchWorkout(id: number) {
  return apiClient.get<Workout>(`/api/workouts/${id}`);
}

/** The editor's tree: the workout with its exercises (catalog entry included) and their sets (the web's key). */
export function fullWorkoutQueryKey(id: number) {
  return ["workout", id, "full"] as const;
}

export function fetchFullWorkout(id: number, init?: Pick<ApiRequestInit, "signal">) {
  return apiClient.get<FullWorkout>(`/api/workouts/${id}/full`, undefined, init);
}

export function updateWorkout(id: number, input: WorkoutInput) {
  return apiClient.patch<Workout>(`/api/workouts/${id}`, input);
}

export function deleteWorkout(id: number) {
  return apiClient.delete<void>(`/api/workouts/${id}`);
}

/**
 * Replaces the workout's entire exercise/set tree (full replace, not merge).
 * Every WorkoutExercise/ExerciseSet id in the response is new. Refused with
 * 409 PRECONDITION_FAILED once any set under the workout has recorded data.
 */
export function replaceWorkoutExercises(workoutId: number, exercises: WorkoutExerciseEntry[]) {
  return apiClient.put<FullWorkout>(`/api/workouts/${workoutId}/exercises`, { exercises });
}
