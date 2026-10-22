import { apiClient, type ApiRequestInit } from "./client";
import type { components } from "./schema";
import type { TrainingPlan, TrainingPlanDetail } from "./types";

type Signal = Pick<ApiRequestInit, "signal">;

/** One student's plans (the student page's Planos tab). */
export function trainingPlansQueryKey(clientId: number) {
  return ["trainingPlans", { clientId }] as const;
}

/** The signed-in client's own plans (the client app; the BFF answers a CLIENT with theirs). */
export const myPlansQueryKey = ["trainingPlans", "mine"] as const;

/** One plan with its workouts (the web's key too). */
export function trainingPlanQueryKey(id: number) {
  return ["trainingPlan", id] as const;
}

export function fetchTrainingPlans(clientId?: number, init?: Signal) {
  return apiClient.get<TrainingPlan[]>("/api/training-plans", { clientId }, init);
}

export function fetchTrainingPlan(id: number, init?: Signal) {
  return apiClient.get<TrainingPlanDetail>(`/api/training-plans/${id}`, undefined, init);
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
