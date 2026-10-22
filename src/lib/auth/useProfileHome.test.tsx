import { QueryClientProvider } from "@tanstack/react-query";
import { renderHook } from "@testing-library/react-native";
import type { ReactNode } from "react";

import { testQueryClient } from "@/test/render";

import { meQueryKey } from "./useMe";
import { useProfileHome } from "./useProfileHome";

async function homeFor(role: string | undefined) {
  const client = testQueryClient();
  if (role !== undefined) client.setQueryData(meQueryKey, { role });
  const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  const { result } = await renderHook(() => useProfileHome(), { wrapper });
  return result.current;
}

describe("useProfileHome", () => {
  it("sends a client to their Perfil tab and anyone else to the trainer's", async () => {
    expect(await homeFor("CLIENT")).toBe("/aluno/perfil");
    expect(await homeFor("TRAINER")).toBe("/perfil");
    expect(await homeFor(undefined)).toBe("/perfil");
  });
});
