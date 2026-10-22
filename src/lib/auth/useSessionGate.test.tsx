import { QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react-native";
import type { ReactNode } from "react";

import { bffError, mockBff, type BffMock } from "@/test/bff";
import { testQueryClient } from "@/test/render";

import { useSessionGate } from "./useSessionGate";

jest.mock("./AuthProvider", () => ({ useAuth: () => ({ status: "signedIn" }) }));

const versions = { terms: "v2", healthData: "v1" };
const me = (role = "TRAINER", termsVersion: string | null = "v2") => ({
  id: 1,
  name: "Ana",
  email: "ana@vertice.fit",
  cpf: "",
  cref: "",
  role,
  consent: { termsVersion, termsAcceptedAt: null, healthDataVersion: null, healthDataConsentAt: null },
});

let bff: BffMock;
afterEach(() => bff.restore());

async function gate() {
  const client = testQueryClient();
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return renderHook(() => useSessionGate(), { wrapper });
}

describe("useSessionGate", () => {
  it("is ready for a trainer who accepted the current terms", async () => {
    bff = mockBff({ "GET /api/auth/me": me(), "GET /api/legal/versions": versions });
    const { result } = await gate();
    expect(result.current.kind).toBe("loading");
    await waitFor(() => expect(result.current.kind).toBe("ready"));
  });

  it("asks for consent when the accepted version is outdated or missing, then records it", async () => {
    bff = mockBff({
      "GET /api/auth/me": me("TRAINER", "v1"),
      "GET /api/legal/versions": versions,
      "POST /api/auth/me/consent": { termsVersion: "v2", termsAcceptedAt: "2026-10-21T12:00:00Z", healthDataVersion: null, healthDataConsentAt: null },
    });
    const { result } = await gate();
    await waitFor(() => expect(result.current.kind).toBe("consent"));
    await act(async () => {
      if (result.current.kind === "consent") result.current.accept();
    });
    await waitFor(() => expect(result.current.kind).toBe("ready"));
    expect(bff.calls.find((c) => c.route === "POST /api/auth/me/consent")?.body).toEqual({ type: "TERMS", version: "v2" });
  });

  it("is ready for a client (the client app)", async () => {
    bff = mockBff({ "GET /api/auth/me": me("CLIENT"), "GET /api/legal/versions": versions });
    const { result } = await gate();
    await waitFor(() => expect(result.current.kind).toBe("ready"));
  });

  it("shows the notice to an admin", async () => {
    bff = mockBff({ "GET /api/auth/me": me("ADMIN"), "GET /api/legal/versions": versions });
    const { result } = await gate();
    await waitFor(() => expect(result.current.kind).toBe("wrongRole"));
  });

  it("fails closed when the versions can't be loaded", async () => {
    bff = mockBff({ "GET /api/auth/me": me(), "GET /api/legal/versions": bffError(503, "UPSTREAM_UNAVAILABLE") });
    const { result } = await gate();
    await waitFor(() => expect(result.current.kind).toBe("error"));
  });

  it("stays in the app when a background refetch fails with the data still cached", async () => {
    let fail = false;
    bff = mockBff({
      "GET /api/auth/me": () => (fail ? bffError(503, "UPSTREAM_UNAVAILABLE") : Response.json(me())),
      "GET /api/legal/versions": versions,
    });
    const client = testQueryClient();
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    );
    const { result } = await renderHook(() => useSessionGate(), { wrapper });
    await waitFor(() => expect(result.current.kind).toBe("ready"));
    fail = true;
    await act(async () => {
      await client.refetchQueries({ queryKey: ["me"] });
    });
    expect(client.getQueryState(["me"])?.status).toBe("error");
    expect(result.current.kind).toBe("ready");
  });

  it("first acceptance isn't called an update", async () => {
    bff = mockBff({ "GET /api/auth/me": me("TRAINER", null), "GET /api/legal/versions": versions });
    const { result } = await gate();
    await waitFor(() => expect(result.current).toMatchObject({ kind: "consent", updated: false }));
  });

  it("a failed accept shows the error and reloads the current version", async () => {
    bff = mockBff({
      "GET /api/auth/me": me("TRAINER", "v1"),
      "GET /api/legal/versions": versions,
      "POST /api/auth/me/consent": bffError(400, "VALIDATION_ERROR"),
    });
    const { result } = await gate();
    await waitFor(() => expect(result.current).toMatchObject({ kind: "consent", updated: true }));
    await act(async () => {
      if (result.current.kind === "consent") result.current.accept();
    });
    await waitFor(() => expect(result.current).toMatchObject({ kind: "consent", acceptError: expect.any(String) }));
    await waitFor(() =>
      expect(bff.calls.filter((c) => c.route === "GET /api/legal/versions").length).toBeGreaterThan(1),
    );
  });
});

