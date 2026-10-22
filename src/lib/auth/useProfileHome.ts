import { useQueryClient } from "@tanstack/react-query";

import type { Me } from "@/lib/api/types";

import { meQueryKey } from "./useMe";

/**
 * Where "back to Perfil" goes when there is no history (a cold deep link to a shared account
 * screen): the client's Perfil tab for a client, the trainer's otherwise. Reads the signed-in
 * account from the cache only — the session gate has always loaded it by then.
 */
export function useProfileHome(): "/perfil" | "/aluno/perfil" {
  const me = useQueryClient().getQueryData<Me>(meQueryKey);
  return me?.role === "CLIENT" ? "/aluno/perfil" : "/perfil";
}
