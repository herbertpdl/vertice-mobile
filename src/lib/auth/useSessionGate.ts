import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { recordConsent } from "@/lib/api/auth";
import { apiErrorMessage } from "@/lib/api/errorMessages";
import { fetchLegalVersions } from "@/lib/api/legal";
import type { Me } from "@/lib/api/types";

import { meQueryKey, useMe } from "./useMe";

export const legalVersionsQueryKey = ["legalVersions"] as const;

export type SessionGate =
  | { kind: "loading" }
  /** Fails closed: without the account or the current versions, the app stays behind the gate. */
  | { kind: "error"; retry: () => void; retrying: boolean }
  /** v1 is the trainer app: any other role gets a notice. */
  | { kind: "wrongRole" }
  | {
      kind: "consent";
      version: string;
      accept: () => void;
      accepting: boolean;
      acceptError?: string;
    }
  | { kind: "ready"; me: Me };

/**
 * What the signed-in area should render: the account (`GET /api/auth/me`) and the current legal
 * versions (`GET /api/legal/versions`) decide between the app, the Terms consent gate and the
 * role notice. Consent is compared against the BFF's version, never an embedded constant (the app
 * ships no copy of the texts — spec §2, "Consent").
 */
export function useSessionGate(): SessionGate {
  const queryClient = useQueryClient();
  const me = useMe();
  const versions = useQuery({ queryKey: legalVersionsQueryKey, queryFn: fetchLegalVersions });
  const consent = useMutation({
    mutationFn: (version: string) => recordConsent({ type: "TERMS", version }),
    onSuccess: (recorded) => {
      queryClient.setQueryData<Me>(meQueryKey, (current) => (current ? { ...current, consent: recorded } : current));
    },
  });

  if (me.isError || versions.isError) {
    return {
      kind: "error",
      retrying: me.isFetching || versions.isFetching,
      retry: () => {
        if (me.isError) void me.refetch();
        if (versions.isError) void versions.refetch();
      },
    };
  }
  if (me.data === undefined || versions.data === undefined) return { kind: "loading" };
  if (me.data.role !== "TRAINER") return { kind: "wrongRole" };

  const current = versions.data.terms;
  if (me.data.consent.termsVersion !== current) {
    return {
      kind: "consent",
      version: current,
      accept: () => consent.mutate(current),
      accepting: consent.isPending,
      acceptError: consent.isError
        ? apiErrorMessage(consent.error, "Não foi possível registrar o aceite. Tente novamente.")
        : undefined,
    };
  }
  return { kind: "ready", me: me.data };
}
