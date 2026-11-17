import { focusManager, onlineManager } from "@tanstack/react-query";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import * as SecureStore from "expo-secure-store";
import { Pressable, Text } from "react-native";

import { apiFetch } from "@/lib/api/client";
import { peekDraft, stashDraft } from "@/lib/draftStash";
import { env } from "@/lib/env";
import { clearExports } from "@/lib/exportData";
import { clearWorkoutData } from "@/lib/workoutSession/outbox";
import { queryClient } from "@/lib/query-client";

import { AuthProvider, useAuth } from "./AuthProvider";
import { RENEWAL_FAILURE_BACKOFF_MS, RENEWAL_INTERVAL_MS } from "./renewal";
import { readStoredSession, storeSession } from "./tokenStorage";

jest.mock("@/lib/exportData", () => ({ clearExports: jest.fn() }));
jest.mock("@/lib/workoutSession/outbox", () => ({ clearWorkoutData: jest.fn() }));

const fetchMock = jest.fn<Promise<Response>, Parameters<typeof fetch>>();
const realFetch = global.fetch;

function Probe() {
  const { status, signIn, signOut, sessionEnded } = useAuth();
  return (
    <>
      <Text>{`status:${status}${sessionEnded === null ? "" : `:${sessionEnded}`}`}</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="in"
        onPress={() => void signIn({ token: "new-token", expiresAt: "2027-02-15T12:00:00.000Z", user: { id: 1, name: "Ana", email: "a@b.c", role: "TRAINER" } })}
      />
      <Pressable accessibilityRole="button" accessibilityLabel="out" onPress={() => void signOut()} />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="password changed"
        onPress={() => void signOut("passwordChanged")}
      />
    </>
  );
}

beforeEach(() => {
  global.fetch = fetchMock as typeof fetch;
});

afterEach(async () => {
  jest.mocked(clearWorkoutData).mockClear();
  global.fetch = realFetch;
  fetchMock.mockReset();
  focusManager.setFocused(undefined);
  onlineManager.setOnline(true);
  await SecureStore.deleteItemAsync("vertice.session.token");
  await SecureStore.deleteItemAsync("vertice.session.renewal");
});

/** A stored session as a previous launch left it. `renewedAt: null` is an 8 h token from an older build. */
function storeToken(token: string, renewedAt: number | null = Date.now()) {
  return storeSession({ token, renewal: renewedAt === null ? null : { expiresAt: "2027-01-01T00:00:00.000Z", renewedAt } });
}

const DAY = RENEWAL_INTERVAL_MS;
const RENEW = `${env.EXPO_PUBLIC_BFF_URL}/api/auth/session/renew`;
const renewed = (token: string) =>
  Response.json({ token, expiresAt: "2027-02-15T12:00:00.000Z", user: { id: 1, name: "Ana", email: "a@b.c", role: "TRAINER" } });
const renewCalls = () => fetchMock.mock.calls.filter(([url]) => url === RENEW);

/** The app leaves and comes back to the foreground (AppState → focusManager in query-client.ts). */
async function foreground() {
  await act(async () => {
    focusManager.setFocused(false);
    focusManager.setFocused(true);
  });
}

/** Lets a renewal that already got its answer finish (body read, catch, single-flight slot freed). */
async function settle() {
  await act(() => new Promise<void>((resolve) => setTimeout(resolve, 50)));
}

/** The connection drops and comes back (NetInfo → onlineManager). */
async function reconnect() {
  await act(async () => {
    onlineManager.setOnline(false);
    onlineManager.setOnline(true);
  });
}

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
    // The login is the session's first use: it's due for renewal a day from now.
    const stored = await readStoredSession();
    expect(stored?.token).toBe("new-token");
    expect(stored?.renewal?.expiresAt).toBe("2027-02-15T12:00:00.000Z");
    expect(Date.now() - stored!.renewal!.renewedAt).toBeLessThan(5_000);
    queryClient.setQueryData(["me"], { name: "Ana" });
    stashDraft("plan:1", { name: "rascunho" });
    await fireEvent.press(screen.getByRole("button", { name: "out" }));
    expect(await screen.findByText("status:signedOut")).toBeOnTheScreen();
    expect(await readStoredSession()).toBeNull();
    expect(await SecureStore.getItemAsync("vertice.session.renewal")).toBeNull();
    expect(queryClient.getQueryData(["me"])).toBeUndefined();
    // An exported data file never outlives the session; "Sair" clears drafts and the workout outbox too.
    expect(clearExports).toHaveBeenCalled();
    expect(clearWorkoutData).toHaveBeenCalled();
    expect(peekDraft("plan:1")).toBeUndefined();
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
    // The workout outbox stays for the re-login (client spec §3.4).
    expect(clearWorkoutData).not.toHaveBeenCalled();
  });

  it("a password change on this phone signs out, keeping drafts and the outbox", async () => {
    await storeToken("tok");
    await mount();
    await screen.findByText("status:signedIn");
    stashDraft("plan:2", { name: "rascunho" });
    await fireEvent.press(screen.getByRole("button", { name: "password changed" }));
    expect(await screen.findByText("status:signedOut:passwordChanged")).toBeOnTheScreen();
    await waitFor(async () => expect(await readStoredSession()).toBeNull());
    expect(peekDraft("plan:2")).toEqual({ name: "rascunho" });
    expect(clearWorkoutData).not.toHaveBeenCalled();
  });
});

describe("AuthProvider session renewal", () => {
  it("renews on launch a token last renewed over a day ago, and keeps the new one", async () => {
    await storeToken("old", Date.now() - DAY - 1);
    fetchMock.mockImplementation(async (url) => (url === RENEW ? renewed("fresh") : Response.json({})));
    await mount();
    await screen.findByText("status:signedIn");
    await waitFor(async () => expect((await readStoredSession())?.token).toBe("fresh"));
    const [, init] = renewCalls()[0];
    const headers = init!.headers as Record<string, string>;
    expect(init!.method).toBe("POST");
    expect(headers.Authorization).toBe("Bearer old");
    expect(headers["X-Vertice-Client"]).toBe("mobile");
    expect(headers["Content-Type"]).toBeUndefined();
    expect(init!.body).toBeUndefined();
    const stored = await readStoredSession();
    expect(stored?.renewal?.expiresAt).toBe("2027-02-15T12:00:00.000Z");
    expect(Date.now() - stored!.renewal!.renewedAt).toBeLessThan(5_000);
    // The next request carries the renewed token, and no second renewal follows the same day.
    await act(() => apiFetch("/api/auth/me"));
    expect((fetchMock.mock.calls.at(-1)![1]!.headers as Record<string, string>).Authorization).toBe("Bearer fresh");
    await foreground();
    expect(renewCalls()).toHaveLength(1);
  });

  it("doesn't renew a token renewed less than a day ago", async () => {
    await storeToken("tok", Date.now() - DAY + 60_000);
    await mount();
    await screen.findByText("status:signedIn");
    await foreground();
    await reconnect();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("renews a token stamped in the future (the clock was set back)", async () => {
    await storeToken("old", Date.now() + DAY);
    fetchMock.mockImplementation(async () => renewed("fresh"));
    await mount();
    await waitFor(() => expect(renewCalls()).toHaveLength(1));
  });

  it("never renews an 8 h token from an older build", async () => {
    await storeToken("legacy", null);
    await mount();
    await screen.findByText("status:signedIn");
    await foreground();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("doesn't renew offline, and renews once the connection is back", async () => {
    await storeToken("old", Date.now() - 2 * DAY);
    onlineManager.setOnline(false);
    fetchMock.mockImplementation(async () => renewed("fresh"));
    await mount();
    await screen.findByText("status:signedIn");
    await foreground();
    expect(fetchMock).not.toHaveBeenCalled();
    await act(async () => onlineManager.setOnline(true));
    await waitFor(async () => expect((await readStoredSession())?.token).toBe("fresh"));
    expect(renewCalls()).toHaveLength(1);
  });

  it("runs one renewal at a time whatever triggers it", async () => {
    await storeToken("old", Date.now() - 2 * DAY);
    let answer!: (r: Response) => void;
    fetchMock.mockImplementation(() => new Promise<Response>((r) => (answer = r)));
    await mount();
    await screen.findByText("status:signedIn");
    await waitFor(() => expect(renewCalls()).toHaveLength(1));
    await foreground();
    await foreground();
    await reconnect();
    expect(renewCalls()).toHaveLength(1);
    await act(async () => answer(renewed("fresh")));
    await waitFor(async () => expect((await readStoredSession())?.token).toBe("fresh"));
    await foreground();
    expect(renewCalls()).toHaveLength(1);
  });

  it("a 401 on renewal signs out as expired, keeping drafts and the outbox", async () => {
    await storeToken("revoked", Date.now() - 100 * DAY);
    stashDraft("plan:3", { name: "rascunho" });
    fetchMock.mockImplementation(async () =>
      Response.json({ error: { code: "UNAUTHENTICATED", message: "x" } }, { status: 401 }),
    );
    await mount();
    expect(await screen.findByText("status:signedOut:expired")).toBeOnTheScreen();
    expect(renewCalls()).toHaveLength(1);
    await waitFor(async () => expect(await readStoredSession()).toBeNull());
    expect(peekDraft("plan:3")).toEqual({ name: "rascunho" });
    expect(clearWorkoutData).not.toHaveBeenCalled();
  });

  it.each(["SESSION_NOT_RENEWABLE", "FORBIDDEN"])("keeps the session and stops asking on a 403 %s", async (code) => {
    await storeToken("web-length", Date.now() - 2 * DAY);
    fetchMock.mockImplementation(async () => Response.json({ error: { code, message: "x" } }, { status: 403 }));
    await mount();
    await waitFor(async () => expect((await readStoredSession())?.renewal).toBeNull());
    expect(screen.getByText("status:signedIn")).toBeOnTheScreen();
    expect((await readStoredSession())?.token).toBe("web-length");
    await foreground();
    expect(renewCalls()).toHaveLength(1);
  });

  it("stops asking on a 404 NOT_FOUND from a BFF without the route", async () => {
    await storeToken("tok", Date.now() - 2 * DAY);
    fetchMock.mockImplementation(async () => Response.json({ error: { code: "NOT_FOUND", message: "x" } }, { status: 404 }));
    await mount();
    await waitFor(async () => expect((await readStoredSession())?.renewal).toBeNull());
    expect(screen.getByText("status:signedIn")).toBeOnTheScreen();
  });

  it.each([403, 404])("a %i without the BFF's error body (a proxy's page) keeps renewing, after the backoff", async (status) => {
    const start = Date.now();
    await storeToken("tok", start - 2 * DAY);
    fetchMock.mockImplementation(async () => new Response("<html>Forbidden</html>", { status, headers: { "Content-Type": "text/html" } }));
    await mount();
    await waitFor(() => expect(renewCalls()).toHaveLength(1));
    await settle();
    expect(screen.getByText("status:signedIn")).toBeOnTheScreen();
    expect((await readStoredSession())?.renewal).not.toBeNull();
    // Not before the hour's backoff...
    await foreground();
    expect(renewCalls()).toHaveLength(1);
    // ...and again once it's over (the clock keeps running, so `waitFor` can still time out).
    const realNow = Date.now.bind(Date);
    const now = jest.spyOn(Date, "now").mockImplementation(() => realNow() + RENEWAL_FAILURE_BACKOFF_MS + 1);
    try {
      fetchMock.mockImplementation(async () => renewed("fresh"));
      await foreground();
      await waitFor(async () => expect((await readStoredSession())?.token).toBe("fresh"));
      expect(renewCalls()).toHaveLength(2);
    } finally {
      now.mockRestore();
    }
  });

  it("retries after a network failure on the next foreground, keeping the token meanwhile", async () => {
    await storeToken("old", Date.now() - 2 * DAY);
    fetchMock.mockRejectedValueOnce(new TypeError("Network request failed"));
    await mount();
    await waitFor(() => expect(renewCalls()).toHaveLength(1));
    await waitFor(() => expect(screen.getByText("status:signedIn")).toBeOnTheScreen());
    expect((await readStoredSession())?.token).toBe("old");
    fetchMock.mockImplementation(async () => renewed("fresh"));
    await foreground();
    await waitFor(async () => expect((await readStoredSession())?.token).toBe("fresh"));
    expect(renewCalls()).toHaveLength(2);
  });

  it("waits out a 429's Retry-After before asking again", async () => {
    await storeToken("old", Date.now() - 2 * DAY);
    fetchMock.mockImplementation(async () =>
      Response.json({ error: { code: "RATE_LIMITED", message: "x" } }, { status: 429, headers: { "Retry-After": "600" } }),
    );
    await mount();
    await waitFor(() => expect(renewCalls()).toHaveLength(1));
    // Let the failure settle (the single-flight slot frees) before the next trigger.
    await settle();
    await foreground();
    expect(renewCalls()).toHaveLength(1);
    expect(screen.getByText("status:signedIn")).toBeOnTheScreen();
  });

  it("drops a renewal that answers after a sign-out", async () => {
    await storeToken("old", Date.now() - 2 * DAY);
    let answer!: (r: Response) => void;
    fetchMock.mockImplementation(() => new Promise<Response>((r) => (answer = r)));
    await mount();
    await waitFor(() => expect(renewCalls()).toHaveLength(1));
    await fireEvent.press(screen.getByRole("button", { name: "out" }));
    expect(await screen.findByText("status:signedOut")).toBeOnTheScreen();
    await act(async () => answer(renewed("fresh")));
    expect(await readStoredSession()).toBeNull();
    fetchMock.mockImplementation(async () => Response.json({}));
    await act(() => apiFetch("/api/auth/me").catch(() => {}));
    expect((fetchMock.mock.calls.at(-1)![1]!.headers as Record<string, string>).Authorization).toBeUndefined();
  });
});
