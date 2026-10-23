import { apiClient, type ApiRequestInit } from "./client";
import type { EnrichedFeedback, FeedbackRating, WorkoutFeedback } from "./types";

export const feedbackQueryKey = ["feedback"] as const;

/** The trainer's feedback, newest first. No `clientId` filter exists yet (audit P2-06). */
export function fetchFeedback(init?: Pick<ApiRequestInit, "signal">) {
  return apiClient.get<EnrichedFeedback[]>("/api/feedback", undefined, init);
}

/** The client's feedback on a session they just finished (PRD R65–R70): a rating, optional text. */
export function submitFeedback(workoutLogId: number, input: { rating: FeedbackRating; text: string }) {
  return apiClient.post<WorkoutFeedback>(`/api/workout-logs/${workoutLogId}/feedback`, input);
}
