import { apiClient, type ApiRequestInit } from "./client";
import type { EnrichedFeedback } from "./types";

/** The trainer's feedback, newest first. No `clientId` filter exists yet (audit P2-06). */
export function fetchFeedback(init?: Pick<ApiRequestInit, "signal">) {
  return apiClient.get<EnrichedFeedback[]>("/api/feedback", undefined, init);
}
