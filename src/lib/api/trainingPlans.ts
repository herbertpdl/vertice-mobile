import { apiClient } from "./client";
import type { components } from "./schema";
import type { TrainingPlan, TrainingPlanDetail } from "./types";

export function fetchTrainingPlans(clientId?: number) {
  return apiClient.get<TrainingPlan[]>("/api/training-plans", { clientId });
}

export function fetchTrainingPlan(id: number) {
  return apiClient.get<TrainingPlanDetail>(`/api/training-plans/${id}`);
}

export type TrainingPlanInput = components["schemas"]["TrainingPlanRequest"];

export function createTrainingPlan(input: TrainingPlanInput) {
  return apiClient.post<TrainingPlan>("/api/training-plans", input);
}

/** `PATCH /training-plans/:id` takes the same body minus `clientId`: a plan never changes client. */
export type TrainingPlanUpdateInput = components["schemas"]["UpdateTrainingPlanRequest"];

export function updateTrainingPlan(id: number, input: TrainingPlanUpdateInput) {
  return apiClient.patch<TrainingPlan>(`/api/training-plans/${id}`, input);
}

export function deleteTrainingPlan(id: number) {
  return apiClient.delete<void>(`/api/training-plans/${id}`);
}
