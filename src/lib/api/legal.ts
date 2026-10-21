import { queryOptions } from "@tanstack/react-query";

import { apiClient, type ApiRequestInit } from "./client";
import type { LegalVersions } from "./types";

/**
 * `GET /api/legal/versions`: the current Terms and health-data consent versions. Public. The app
 * ships no copy of the texts (it opens the web's `/termos` and `/privacidade`), so this — not an
 * embedded constant — is what consent is compared against (spec §2, "Consent").
 */
export function fetchLegalVersions(init?: Pick<ApiRequestInit, "signal">) {
  return apiClient.get<LegalVersions>("/api/legal/versions", undefined, { ...init, auth: false });
}

/** The one query for the legal versions (sign-up and the consent gate share it). */
export const legalVersionsQuery = queryOptions({
  queryKey: ["legalVersions"],
  queryFn: ({ signal }) => fetchLegalVersions({ signal }),
});
