import { apiClient, type ApiRequestInit } from "./client";
import type { DashboardData } from "./types";

export const dashboardQueryKey = ["dashboard"] as const;

export function fetchDashboard(init?: Pick<ApiRequestInit, "signal">) {
  return apiClient.get<DashboardData>("/api/dashboard", undefined, init);
}
