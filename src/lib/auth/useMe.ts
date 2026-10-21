import { useQuery } from "@tanstack/react-query";

import { fetchMe } from "@/lib/api/auth";

import { useAuth } from "./AuthProvider";

export const meQueryKey = ["me"] as const;

/** `GET /api/auth/me`: who is signed in, their role and consents. Runs only with a session. */
export function useMe() {
  const { status } = useAuth();
  return useQuery({
    queryKey: meQueryKey,
    queryFn: ({ signal }) => fetchMe({ signal }),
    enabled: status === "signedIn",
  });
}
