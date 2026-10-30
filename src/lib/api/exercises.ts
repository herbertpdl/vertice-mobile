import { apiClient, type ApiRequestInit } from "./client";
import type { components } from "./schema";
import type { Exercise, ExercisePage, ExerciseProgressPoint } from "./types";

export interface ExerciseListParams {
  muscleGroupId?: number | null;
  q?: string;
}

/** The search text that triggers a query; shorter is never sent (lazy-exercise-search D5). */
export const EXERCISE_SEARCH_MIN_LENGTH = 3;

/**
 * What the picker or the catalog may ask for (spec: lazy-exercise-search). Nothing until the
 * search has 3 or more letters or a group is chosen; below 3 letters the text is dropped, even
 * with a group, so results don't jump on each keystroke.
 */
export function exerciseSearch(search: string, muscleGroupId: number | null) {
  const trimmed = search.trim();
  const q = trimmed.length >= EXERCISE_SEARCH_MIN_LENGTH ? trimmed : "";
  return { muscleGroupId, q, enabled: q !== "" || muscleGroupId !== null };
}

/** Every list key starts with this: invalidate it after a create, edit or delete. */
export const exercisesQueryPrefix = ["exercises"] as const;

/**
 * Normalized key of a paged search, so every screen produces the same key for the same
 * filter and `invalidateQueries({ queryKey: exercisesQueryPrefix })` covers them all.
 */
export function exercisesQueryKey(params: ExerciseListParams = {}) {
  return [
    ...exercisesQueryPrefix,
    { muscleGroupId: params.muscleGroupId ?? null, q: (params.q ?? "").trim() },
  ] as const;
}

/** One page; `cursor` is the previous page's `nextCursor`. */
export function fetchExercisesPage(
  params: ExerciseListParams & { cursor?: string | null; limit?: number } = {},
  init?: Pick<ApiRequestInit, "signal">,
) {
  const q = (params.q ?? "").trim();
  const query = {
    muscleGroupId: params.muscleGroupId ?? undefined,
    q: q || undefined,
    cursor: params.cursor ?? undefined,
    limit: params.limit,
  };
  return apiClient.get<ExercisePage>("/api/exercises", query, init);
}

/** Under the same prefix, so a catalog change invalidates it too. */
export const allExercisesQueryKey = [...exercisesQueryPrefix, "all"] as const;

/**
 * Every visible exercise, page by page. Only the student progress dropdown uses it until that
 * becomes a searchable picker (spec §6): never use it for the picker or the catalog.
 */
export async function fetchAllExercises(init?: Pick<ApiRequestInit, "signal">): Promise<Exercise[]> {
  const all: Exercise[] = [];
  let cursor: string | null = null;
  do {
    const page: ExercisePage = await fetchExercisesPage({ cursor, limit: 50 }, init);
    all.push(...page.exercises);
    cursor = page.nextCursor;
  } while (cursor !== null);
  return all;
}

/** One exercise (the detail screen and its edit form). */
export function exerciseQueryKey(id: number) {
  return ["exercise", id] as const;
}

export function fetchExercise(id: number, init?: Pick<ApiRequestInit, "signal">) {
  return apiClient.get<Exercise>(`/api/exercises/${id}`, undefined, init);
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
