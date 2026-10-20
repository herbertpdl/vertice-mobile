import { useQuery } from "@tanstack/react-query";

import { fetchMe } from "@/lib/api/auth";

export const meQueryKey = ["me"] as const;

/** `GET /api/auth/me`: who is signed in, their role and consents. Enabled only with a session. */
export function useMe(enabled = true) {
  return useQuery({ queryKey: meQueryKey, queryFn: fetchMe, enabled });
}
