import { apiClient } from "./client";
import type { components } from "./schema";
import type { WorkoutExercise } from "./types";

export function fetchWorkoutExercises(workoutId: number) {
  return apiClient.get<WorkoutExercise[]>(`/api/workouts/${workoutId}/exercises`);
}

export type WorkoutExerciseCreateInput = components["schemas"]["CreateWorkoutExerciseRequest"];

export function addWorkoutExercise(workoutId: number, input: WorkoutExerciseCreateInput) {
  return apiClient.post<WorkoutExercise>(`/api/workouts/${workoutId}/exercises`, input);
}

export type WorkoutExerciseUpdateInput = components["schemas"]["UpdateWorkoutExerciseRequest"];

export function updateWorkoutExercise(id: number, input: WorkoutExerciseUpdateInput) {
  return apiClient.patch<WorkoutExercise>(`/api/workout-exercises/${id}`, input);
}

export function deleteWorkoutExercise(id: number) {
  return apiClient.delete<void>(`/api/workout-exercises/${id}`);
}
