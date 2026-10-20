import { act, fireEvent, render, screen } from "@testing-library/react-native";
import * as SecureStore from "expo-secure-store";
import { Pressable, Text } from "react-native";

import { apiFetch } from "@/lib/api/client";

import { AuthProvider, useAuth } from "./AuthProvider";
import { storeToken } from "./tokenStorage";

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
    await fireEvent.press(screen.getByRole("button", { name: "out" }));
    expect(await screen.findByText("status:signedOut")).toBeOnTheScreen();
    expect(await SecureStore.getItemAsync("vertice.session.token")).toBeNull();
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
