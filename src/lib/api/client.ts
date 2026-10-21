import { env } from "@/lib/env";

import { parseRetryAfter } from "./rateLimit";
import type { components, paths } from "./schema";

/** The `{ error: { code, message, details? } }` body every vertice-bff error has. */
type ApiErrorBody = components["schemas"]["ErrorResponse"];

/**
 * The codes vertice-bff documents. Key on `code`, never on `message` (it is English, for logs).
 * Use this where exhaustiveness is actually wanted (a `switch` over handled codes); `ApiError`'s
 * own `code` is wider: see below.
 */
export type ErrorCode = components["schemas"]["ErrorCode"];

/**
 * Codes this app mints for failures that never reached a BFF response: no network, the request
 * timed out, or a response with no parseable error body.
 */
export type ClientErrorCode = "NETWORK_ERROR" | "TIMEOUT" | "UNKNOWN_ERROR";

/** How long a request may take before it fails with `TIMEOUT` (audit P2-05). */
export const REQUEST_TIMEOUT_MS = 15_000;

/**
 * What `ApiError` is built from: the BFF's error body, widened to any `code` — a BFF deployed
 * ahead of this build can send a code this copy of the spec does not know yet, and an installed
 * app can lag the server by months, so screens must handle an unknown code anyway
 * (`apiErrorMessage` falls back). `ClientErrorCode`s are this app's own. Same shape as the web's.
 */
export type ApiErrorInit = { code: string; message: string; details?: unknown };

export class ApiError extends Error {
  code: string;
  /**
   * Only on `VALIDATION_ERROR`: Zod's flattened field errors,
   * `{ formErrors: string[], fieldErrors: Record<string, string[]> }`.
   */
  details?: unknown;
  /** The HTTP status, or 0 when no response arrived (`NETWORK_ERROR`, `TIMEOUT`). */
  status: number;
  /** Seconds to wait, from `Retry-After` (sent with 429 `RATE_LIMITED`). */
  retryAfter?: number;

  constructor(body: ApiErrorInit, status: number, retryAfter?: number) {
    super(body.message);
    this.name = "ApiError";
    this.code = body.code;
    this.details = body.details;
    this.status = status;
    this.retryAfter = retryAfter;
  }
}

type JsonBody<T> = T extends { content: { "application/json": infer B } } ? B : never;

/**
 * The JSON body a successful call answers with, e.g. `ApiResult<"/api/auth/me", "get">`.
 * `never` for the 204 routes (`apiFetch` resolves to `undefined` there).
 */
export type ApiResult<
  P extends keyof paths,
  M extends keyof paths[P],
> = paths[P][M] extends { responses: infer R }
  ? JsonBody<R[Extract<keyof R, 200 | 201>]>
  : never;

/** The JSON body a call takes, e.g. `ApiBody<"/api/auth/login", "post">`. */
export type ApiBody<
  P extends keyof paths,
  M extends keyof paths[P],
> = paths[P][M] extends { requestBody?: infer B } ? JsonBody<NonNullable<B>> : never;

// --- Session wiring ------------------------------------------------------------------------------
// The auth module (`src/lib/auth/`) owns the session; it registers how to read the token and what
// to do on a 401 here, so this module stays free of React and storage.

let readToken: () => string | null = () => null;
let onUnauthorized: (rejectedToken: string) => void = () => {};

/**
 * Registers the session with the client: where the bearer token comes from, and what to do when
 * the BFF rejects one. `onUnauthorized` receives the token the failed request *carried*, so a late
 * 401 from a request sent under an earlier session can't end the current one. Returns an
 * unregister function (call it when the session owner unmounts).
 */
export function configureApiSession(options: {
  getToken: () => string | null;
  onUnauthorized: (rejectedToken: string) => void;
}): () => void {
  readToken = options.getToken;
  onUnauthorized = options.onUnauthorized;
  return () => {
    if (readToken === options.getToken) {
      readToken = () => null;
      onUnauthorized = () => {};
    }
  };
}

export type ApiRequestInit = Omit<RequestInit, "body" | "headers"> & {
  headers?: Record<string, string>;
  /** Serialized as JSON. */
  body?: unknown;
  query?: Record<string, string | number | boolean | undefined>;
  /**
   * `false` for the public routes (login, register, legal versions, password setup): no bearer
   * token is sent, and a 401 there means "wrong credentials", not "session over", so it does not
   * sign the user out.
   */
  auth?: boolean;
};

function withQuery(path: string, query: ApiRequestInit["query"]): string {
  if (query === undefined) return path;
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined) params.set(key, String(value));
  }
  const search = params.toString();
  return search === "" ? path : `${path}?${search}`;
}

function parseJson(text: string): unknown {
  if (text === "") return undefined;
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}

type RawResponse = { response: Response; text: string; sentToken: string | null };

async function send(path: string, init: ApiRequestInit = {}): Promise<RawResponse> {
  const { body, query, auth = true, headers: extraHeaders, signal, ...rest } = init;
  const headers: Record<string, string> = { Accept: "application/json", ...extraHeaders };
  if (body !== undefined) headers["Content-Type"] = "application/json";
  const sentToken = auth ? readToken() : null;
  if (sentToken !== null) headers.Authorization = `Bearer ${sentToken}`;

  // One controller for both the timeout and a caller's signal (React Query cancels queries).
  const controller = new AbortController();
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, REQUEST_TIMEOUT_MS);
  const forwardAbort = () => controller.abort();
  if (signal?.aborted) controller.abort();
  else signal?.addEventListener("abort", forwardAbort, { once: true });

  try {
    const response = await fetch(`${env.EXPO_PUBLIC_BFF_URL}${withQuery(path, query)}`, {
      ...rest,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: controller.signal,
    });
    const text = await response.text();
    return { response, text, sentToken };
  } catch (error) {
    if (timedOut) throw new ApiError({ code: "TIMEOUT", message: "Request timed out" }, 0);
    // A caller's own abort is not a failure to report: rethrow it as is.
    if (signal?.aborted) throw error;
    throw new ApiError(
      { code: "NETWORK_ERROR", message: error instanceof Error ? error.message : "Network request failed" },
      0,
    );
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener("abort", forwardAbort);
  }
}

/** The BFF's `{ error: { code, message } }`, or null for anything else (a proxy's HTML or `{"error":"Bad Gateway"}`). */
function bffErrorBody(data: unknown): ApiErrorBody["error"] | null {
  const error = (data as { error?: unknown } | undefined)?.error;
  if (typeof error !== "object" || error === null) return null;
  const { code, message } = error as { code?: unknown; message?: unknown };
  return typeof code === "string" && typeof message === "string" ? (error as ApiErrorBody["error"]) : null;
}

function failure({ response, text, sentToken }: RawResponse): ApiError {
  const error = new ApiError(
    bffErrorBody(parseJson(text)) ?? { code: "UNKNOWN_ERROR", message: response.statusText || "Request failed" },
    response.status,
    parseRetryAfter(response.headers.get("Retry-After")),
  );
  // Only a token the BFF rejected ends a session — and only the session that sent it.
  if (response.status === 401 && sentToken !== null) onUnauthorized(sentToken);
  return error;
}

/**
 * Calls vertice-bff. `path` is the route exactly as the generated spec names it, `/api` prefix
 * included (`/api/clients/7`, `/health`), and `T` comes from `ApiResult<path, method>` so a
 * response shape that changed upstream fails `npm run typecheck` here. Every failure is an
 * `ApiError` (network and timeout included); a 401 on an authenticated call also signs out.
 */
export async function apiFetch<T>(path: string, init: ApiRequestInit = {}): Promise<T> {
  const raw = await send(path, init);
  if (!raw.response.ok) throw failure(raw);
  if (raw.response.status === 204 || raw.text === "") return undefined as T;
  const data = parseJson(raw.text);
  if (data === undefined) {
    throw new ApiError({ code: "UNKNOWN_ERROR", message: "Response is not JSON" }, raw.response.status);
  }
  return data as T;
}

const SAFE_FILENAME = /^[\w-][\w.-]*$/;

/**
 * The `filename` of a `Content-Disposition: attachment; filename="…"` header, or `undefined` when
 * there is none or it is anything but a plain name (a path, `..`, spaces, non-ASCII) — the same
 * allow-list as the web's.
 */
export function attachmentFilename(disposition: string | null): string | undefined {
  const match = disposition?.match(/filename\s*=\s*(?:"([^"]*)"|([^;\s]+))/i);
  const name = (match?.[1] ?? match?.[2])?.trim();
  if (!name || !SAFE_FILENAME.test(name) || name.includes("..")) return undefined;
  return name;
}

/** A file the BFF answers as an attachment (`GET /api/auth/me/export`): its text and name. */
export async function apiDownload(
  path: string,
  fallbackName: string,
): Promise<{ text: string; filename: string }> {
  const raw = await send(path, { method: "GET" });
  if (!raw.response.ok) throw failure(raw);
  return {
    text: raw.text,
    filename: attachmentFilename(raw.response.headers.get("Content-Disposition")) ?? fallbackName,
  };
}

type Query = ApiRequestInit["query"];

/** Shorthands over `apiFetch`, the shape of the web's `apiClient`. Paths keep the `/api` prefix. */
export const apiClient = {
  get: <T>(path: string, query?: Query, init?: ApiRequestInit) =>
    apiFetch<T>(path, { ...init, method: "GET", query }),
  post: <T>(path: string, body?: unknown, init?: ApiRequestInit) =>
    apiFetch<T>(path, { ...init, method: "POST", body }),
  put: <T>(path: string, body?: unknown, init?: ApiRequestInit) =>
    apiFetch<T>(path, { ...init, method: "PUT", body }),
  patch: <T>(path: string, body?: unknown, init?: ApiRequestInit) =>
    apiFetch<T>(path, { ...init, method: "PATCH", body }),
  delete: <T = void>(path: string, body?: unknown, init?: ApiRequestInit) =>
    apiFetch<T>(path, { ...init, method: "DELETE", body }),
};
