import { act, fireEvent, render, screen } from "@testing-library/react-native";
import * as SecureStore from "expo-secure-store";
import { Pressable, Text } from "react-native";

import { apiFetch } from "@/lib/api/client";
import { clearExports } from "@/lib/exportData";
import { queryClient } from "@/lib/query-client";

import { AuthProvider, useAuth } from "./AuthProvider";
import { storeToken } from "./tokenStorage";

jest.mock("@/lib/exportData", () => ({ clearExports: jest.fn() }));

const fetchMock = jest.fn<Promise<Response>, Parameters<typeof fetch>>();
const realFetch = global.fetch;

function Probe() {
  const { status, signIn, signOut, sessionExpired } = useAuth();
  return (
    <>
      <Text>{`status:${status}${sessionExpired ? ":expired" : ""}`}</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="in"
        onPress={() => void signIn({ token: "new-token", user: { id: 1, name: "Ana", email: "a@b.c", role: "TRAINER" } })}
      />
      <Pressable accessibilityRole="button" accessibilityLabel="out" onPress={() => void signOut()} />
    </>
  );
}

beforeEach(() => {
  global.fetch = fetchMock as typeof fetch;
});

afterEach(async () => {
  global.fetch = realFetch;
  fetchMock.mockReset();
  await SecureStore.deleteItemAsync("vertice.session.token");
});

async function mount() {
  await render(
    <AuthProvider>
      <Probe />
    </AuthProvider>,
  );
}

describe("AuthProvider", () => {
  it("starts signed out without a stored token", async () => {
    await mount();
    expect(await screen.findByText("status:signedOut")).toBeOnTheScreen();
  });

  it("restores a stored token and sends it as the bearer", async () => {
    await storeToken("stored-token");
    await mount();
    expect(await screen.findByText("status:signedIn")).toBeOnTheScreen();
    fetchMock.mockResolvedValue(Response.json({}));
    await act(() => apiFetch("/api/auth/me"));
    expect((fetchMock.mock.calls[0][1]!.headers as Record<string, string>).Authorization).toBe("Bearer stored-token");
  });

  it("signs in (persisting the token) and out (clearing it)", async () => {
    await mount();
    await screen.findByText("status:signedOut");
    await fireEvent.press(screen.getByRole("button", { name: "in" }));
    expect(await screen.findByText("status:signedIn")).toBeOnTheScreen();
    expect(await SecureStore.getItemAsync("vertice.session.token")).toBe("new-token");
    queryClient.setQueryData(["me"], { name: "Ana" });
    await fireEvent.press(screen.getByRole("button", { name: "out" }));
    expect(await screen.findByText("status:signedOut")).toBeOnTheScreen();
    expect(await SecureStore.getItemAsync("vertice.session.token")).toBeNull();
    expect(queryClient.getQueryData(["me"])).toBeUndefined();
    // An exported data file never outlives the session.
    expect(clearExports).toHaveBeenCalled();
  });

  it("a late 401 from the previous session doesn't sign out the new one", async () => {
    await storeToken("old-token");
    await mount();
    await screen.findByText("status:signedIn");
    let answerLate!: (r: Response) => void;
    // Mocks answer in call order: the late request is sent first and stays pending.
    fetchMock
      .mockImplementationOnce(() => new Promise<Response>((r) => (answerLate = r)))
      .mockResolvedValueOnce(Response.json({ error: { code: "UNAUTHORIZED", message: "x" } }, { status: 401 }))
      .mockResolvedValueOnce(Response.json({ error: { code: "UNAUTHORIZED", message: "x" } }, { status: 401 }));
    // Two requests 401 together, a third (sent with the old token) is still in flight.
    const late = apiFetch("/api/feedback").catch(() => {});
    await act(async () => {
      await Promise.all([apiFetch("/api/clients").catch(() => {}), apiFetch("/api/dashboard").catch(() => {})]);
    });
    expect(await screen.findByText("status:signedOut:expired")).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole("button", { name: "in" }));
    expect(await screen.findByText("status:signedIn")).toBeOnTheScreen();
    await act(async () => {
      answerLate(Response.json({ error: { code: "UNAUTHORIZED", message: "x" } }, { status: 401 }));
      await late;
    });
    expect(screen.getByText("status:signedIn")).toBeOnTheScreen();
    expect(await SecureStore.getItemAsync("vertice.session.token")).toBe("new-token");
  });

  it("a 401 on an authenticated call signs out as expired", async () => {
    await storeToken("old-token");
    await mount();
    await screen.findByText("status:signedIn");
    fetchMock.mockResolvedValue(Response.json({ error: { code: "UNAUTHORIZED", message: "x" } }, { status: 401 }));
    await act(async () => {
      await apiFetch("/api/clients").catch(() => {});
    });
    expect(await screen.findByText("status:signedOut:expired")).toBeOnTheScreen();
  });
});
