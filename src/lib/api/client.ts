import { env } from "@/lib/env";

import type { components, paths } from "./schema";

/** The `{ error: { code, message, details? } }` body every vertice-bff error has. */
type ApiErrorBody = components["schemas"]["ErrorResponse"];

/** vertice-bff's error codes. Key on these, never on `message` (it is English, for logs). */
export type ErrorCode = components["schemas"]["ErrorCode"];

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code?: ErrorCode,
    /**
     * Only on `VALIDATION_ERROR`: Zod's flattened field errors,
     * `{ formErrors: string[], fieldErrors: Record<string, string[]> }`.
     */
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
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

/**
 * Calls vertice-bff. `path` is the route exactly as the generated spec names it, `/api` prefix
 * included (`/api/clients/7`, `/health`), and `T` comes from `ApiResult<path, method>` so a
 * response shape that changed upstream fails `npm run typecheck` here.
 */
export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${env.EXPO_PUBLIC_BFF_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as ApiErrorBody | null;
    throw new ApiError(
      body?.error?.message ?? response.statusText,
      response.status,
      body?.error?.code,
      body?.error?.details,
    );
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}
