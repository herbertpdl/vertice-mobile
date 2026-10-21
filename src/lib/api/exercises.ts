import { apiClient } from "./client";
import type { components } from "./schema";
import type { Exercise, ExerciseProgressPoint } from "./types";

export interface ExerciseListParams {
  muscleGroupId?: number | null;
  q?: string;
}

/**
 * Normalized list key, so every screen produces the same key for the same
 * filter and `invalidateQueries({ queryKey: ["exercises"] })` covers them all.
 */
export function exercisesQueryKey(params: ExerciseListParams = {}) {
  return [
    "exercises",
    { muscleGroupId: params.muscleGroupId ?? null, q: (params.q ?? "").trim() },
  ] as const;
}

export function fetchExercises(params: ExerciseListParams = {}) {
  const q = (params.q ?? "").trim();
  const query = { muscleGroupId: params.muscleGroupId ?? undefined, q: q || undefined };
  // No query string at all for the unfiltered list.
  const hasQuery = query.muscleGroupId !== undefined || query.q !== undefined;
  return apiClient.get<Exercise[]>("/api/exercises", hasQuery ? query : undefined);
}

export function fetchExercise(id: number) {
  return apiClient.get<Exercise>(`/api/exercises/${id}`);
}

export function exerciseProgressQueryKey(exerciseId: number, clientId: number) {
  return ["exerciseProgress", exerciseId, clientId] as const;
}

export function fetchExerciseProgress(id: number, clientId?: number) {
  return apiClient.get<ExerciseProgressPoint[]>(`/api/exercises/${id}/progress`, {
    clientId,
  });
}

export type ExerciseInput = components["schemas"]["ExerciseRequest"];

export function createExercise(input: ExerciseInput) {
  return apiClient.post<Exercise>("/api/exercises", input);
}

export function updateExercise(id: number, input: ExerciseInput) {
  return apiClient.patch<Exercise>(`/api/exercises/${id}`, input);
}

export function deleteExercise(id: number) {
  return apiClient.delete<void>(`/api/exercises/${id}`);
}
