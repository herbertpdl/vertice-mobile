import { apiClient, type ApiRequestInit } from "./client";
import type { MuscleGroup } from "./types";

/** Reference data the platform team changes rarely: consumers query it with `staleTime: Infinity`. */
export const muscleGroupsQueryKey = ["muscleGroups"] as const;

export function fetchMuscleGroups(init?: Pick<ApiRequestInit, "signal">) {
  return apiClient.get<MuscleGroup[]>("/api/muscle-groups", undefined, init);
}
