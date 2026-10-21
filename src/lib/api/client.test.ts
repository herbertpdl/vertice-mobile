import { env } from "@/lib/env";

import { ApiError, apiClient, apiFetch, configureApiSession, REQUEST_TIMEOUT_MS } from "./client";

const BFF = env.EXPO_PUBLIC_BFF_URL;
const fetchMock = jest.fn<Promise<Response>, Parameters<typeof fetch>>();
const realFetch = global.fetch;
const onUnauthorized = jest.fn();

beforeEach(() => {
  global.fetch = fetchMock as typeof fetch;
  configureApiSession({ getToken: () => "tok-123", onUnauthorized });
});

afterEach(() => {
  global.fetch = realFetch;
  fetchMock.mockReset();
  onUnauthorized.mockReset();
  jest.useRealTimers();
});

function sentHeaders(call = 0): Record<string, string> {
  return fetchMock.mock.calls[call][1]!.headers as Record<string, string>;
}

describe("apiFetch", () => {
  it("calls the BFF with the bearer token, JSON headers and the query", async () => {
    fetchMock.mockResolvedValue(Response.json([{ id: 1 }]));
    await expect(apiClient.get("/api/exercises", { q: "supino", muscleGroupId: 3, x: undefined })).resolves.toEqual([
      { id: 1 },
    ]);
    expect(fetchMock.mock.calls[0][0]).toBe(`${BFF}/api/exercises?q=supino&muscleGroupId=3`);
    expect(sentHeaders()).toMatchObject({ Accept: "application/json", Authorization: "Bearer tok-123" });
    expect(sentHeaders()["Content-Type"]).toBeUndefined();
  });

  it("sends Content-Type only with a body, and keeps caller headers", async () => {
    fetchMock.mockResolvedValue(Response.json({ ok: true }));
    await apiFetch("/api/clients", { method: "POST", body: { name: "Ana" }, headers: { "X-Trace": "1" } });
    expect(sentHeaders()).toMatchObject({ "Content-Type": "application/json", "X-Trace": "1" });
    expect(fetchMock.mock.calls[0][1]!.body).toBe('{"name":"Ana"}');
  });

  it("resolves undefined for 204", async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 204 }));
    await expect(apiClient.delete("/api/clients/1")).resolves.toBeUndefined();
  });

  it("turns the BFF error body into an ApiError, with Retry-After", async () => {
    fetchMock.mockResolvedValue(
      Response.json(
        { error: { code: "RATE_LIMITED", message: "Too many", details: { a: 1 } } },
        { status: 429, headers: { "Retry-After": "30" } },
      ),
    );
    const error = await apiFetch("/api/clients").catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ code: "RATE_LIMITED", status: 429, retryAfter: 30, details: { a: 1 } });
  });

  it("gives an UNKNOWN_ERROR code to a failure without a JSON body", async () => {
    fetchMock.mockResolvedValue(new Response("<html>bad gateway</html>", { status: 502 }));
    await expect(apiFetch("/api/clients")).rejects.toMatchObject({ code: "UNKNOWN_ERROR", status: 502 });
  });

  it("maps a network failure to NETWORK_ERROR", async () => {
    fetchMock.mockRejectedValue(new TypeError("Network request failed"));
    await expect(apiFetch("/api/clients")).rejects.toMatchObject({ code: "NETWORK_ERROR", status: 0 });
  });

  it("times out with TIMEOUT", async () => {
    jest.useFakeTimers();
    fetchMock.mockImplementation(
      (_url, init) =>
        new Promise((_resolve, reject) => {
          init!.signal!.addEventListener("abort", () => reject(new Error("aborted")));
        }),
    );
    const pending = apiFetch("/api/clients").catch((e: unknown) => e);
    jest.advanceTimersByTime(REQUEST_TIMEOUT_MS);
    await expect(pending).resolves.toMatchObject({ code: "TIMEOUT", status: 0 });
  });

  it("reports a 401 with the token the request carried", async () => {
    fetchMock.mockResolvedValue(Response.json({ error: { code: "UNAUTHORIZED", message: "x" } }, { status: 401 }));
    await expect(apiFetch("/api/auth/me")).rejects.toMatchObject({ status: 401 });
    expect(onUnauthorized).toHaveBeenCalledWith("tok-123");
  });

  it("doesn't report a 401 for a request sent without a token", async () => {
    configureApiSession({ getToken: () => null, onUnauthorized });
    fetchMock.mockResolvedValue(Response.json({ error: { code: "UNAUTHORIZED", message: "x" } }, { status: 401 }));
    await expect(apiFetch("/api/auth/me")).rejects.toMatchObject({ status: 401 });
    expect(onUnauthorized).not.toHaveBeenCalled();
  });

  it("treats an error body that isn't the BFF's shape as UNKNOWN_ERROR", async () => {
    fetchMock.mockResolvedValue(Response.json({ error: "Bad Gateway" }, { status: 502, statusText: "Bad Gateway" }));
    await expect(apiFetch("/api/clients")).rejects.toMatchObject({ code: "UNKNOWN_ERROR", status: 502 });
  });

  it("rethrows a caller's abort as is, including one that happened before the call", async () => {
    fetchMock.mockImplementation(
      (_url, init) =>
        new Promise((_resolve, reject) => {
          if (init!.signal!.aborted) reject(new Error("AbortError"));
          init!.signal!.addEventListener("abort", () => reject(new Error("AbortError")));
        }),
    );
    const controller = new AbortController();
    controller.abort();
    await expect(apiFetch("/api/clients", { signal: controller.signal })).rejects.toThrow("AbortError");
  });

  it("unregisters a session", async () => {
    const unregister = configureApiSession({ getToken: () => "x", onUnauthorized });
    unregister();
    fetchMock.mockResolvedValue(Response.json({}));
    await apiFetch("/api/auth/me");
    expect(sentHeaders().Authorization).toBeUndefined();
  });

  it("public calls send no token and a 401 there doesn't sign out", async () => {
    fetchMock.mockResolvedValue(
      Response.json({ error: { code: "UNAUTHORIZED", message: "Invalid email or password" } }, { status: 401 }),
    );
    await expect(apiClient.post("/api/auth/login", { email: "a", password: "b" }, { auth: false })).rejects.toMatchObject({
      status: 401,
    });
    expect(sentHeaders().Authorization).toBeUndefined();
    expect(onUnauthorized).not.toHaveBeenCalled();
  });
});
