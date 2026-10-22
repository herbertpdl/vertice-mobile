import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { recordConsent } from "@/lib/api/auth";
import { apiErrorMessage } from "@/lib/api/errorMessages";
import { legalVersionsQuery } from "@/lib/api/legal";
import type { Me } from "@/lib/api/types";

import { meQueryKey, useMe } from "./useMe";

export type SessionGate =
  | { kind: "loading" }
  /** Fails closed: without the account or the current versions, the app stays behind the gate. */
  | { kind: "error"; retry: () => void; retrying: boolean }
  /** The app serves trainers and clients; an admin gets a notice. */
  | { kind: "wrongRole" }
  | {
      kind: "consent";
      version: string;
      /** False for a first acceptance (accounts that never accepted any version). */
      updated: boolean;
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
 *
 * The decision reads the *data*, never the error flag (like the web's `TermsConsentGate`): a
 * background refetch that fails while the data is still cached must not swap the signed-in app
 * for the error screen and throw away its navigation state.
 */
export function useSessionGate(): SessionGate {
  const queryClient = useQueryClient();
  const me = useMe();
  const versions = useQuery(legalVersionsQuery);
  const consent = useMutation({
    mutationFn: (version: string) => recordConsent({ type: "TERMS", version }),
    onSuccess: (recorded) => {
      queryClient.setQueryData<Me>(meQueryKey, (current) => (current ? { ...current, consent: recorded } : current));
    },
    // The version may have changed since the gate loaded it: fetch the current one before a retry.
    onError: () => void queryClient.invalidateQueries({ queryKey: legalVersionsQuery.queryKey }),
  });

  const meMissing = me.data === undefined;
  const versionsMissing = versions.data === undefined;
  if ((meMissing && me.isError) || (versionsMissing && versions.isError)) {
    return {
      kind: "error",
      retrying: me.isFetching || versions.isFetching,
      retry: () => {
        if (meMissing) void me.refetch();
        if (versionsMissing) void versions.refetch();
      },
    };
  }
  if (me.data === undefined || versions.data === undefined) return { kind: "loading" };
  if (me.data.role !== "TRAINER" && me.data.role !== "CLIENT") return { kind: "wrongRole" };

  const current = versions.data.terms;
  const accepted = me.data.consent.termsVersion;
  if (accepted !== current) {
    return {
      kind: "consent",
      version: current,
      updated: accepted !== null,
      accept: () => consent.mutate(current),
      accepting: consent.isPending,
      acceptError: consent.isError
        ? apiErrorMessage(consent.error, "Não foi possível registrar o aceite. Tente novamente.")
        : undefined,
    };
  }
  return { kind: "ready", me: me.data };
}
