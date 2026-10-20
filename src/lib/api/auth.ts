import { apiClient, apiDownload } from "./client";
import type { components } from "./schema";
import { isMaskedCpf } from "./students";
import type { AuthSession, Consent, Me } from "./types";

type Schemas = components["schemas"];

// The public routes (`auth: false`): no bearer token goes out, and a 401 there is "wrong e-mail or
// password", not "session over", so it doesn't sign anyone out (see `apiFetch`). Unlike the web,
// which goes through its own cookie-setting route handlers, the app calls the BFF directly and
// keeps the returned token itself (`src/lib/auth/`).

/** `POST /api/auth/login`: the session token and user. 401 on a wrong e-mail or password. */
export function login(input: Schemas["LoginRequest"]) {
  return apiClient.post<AuthSession>("/api/auth/login", input, { auth: false });
}

export type RegisterInput = Omit<Schemas["RegisterRequest"], "role">;

/** `POST /api/auth/register`: trainer self-sign-up (public sign-up is trainers only). */
export function register(input: RegisterInput) {
  const body: Schemas["RegisterRequest"] = { ...input, role: "TRAINER" };
  return apiClient.post<AuthSession>("/api/auth/register", body, { auth: false });
}

/** First access: redeem a setup token from the link the trainer shared. No session needed. */
export async function setupPassword(input: Schemas["PasswordSetupRequest"]) {
  await apiClient.post<void>("/api/auth/password/setup", input, { auth: false });
}

export function fetchMe() {
  return apiClient.get<Me>("/api/auth/me");
}

/** Records the caller's own consent (self only: no user id). Returns the new consent state. */
export function recordConsent(input: Schemas["ConsentRequest"]) {
  return apiClient.post<Consent>("/api/auth/me/consent", input);
}

/**
 * `PATCH /api/auth/me`: only the fields to change (an omitted one keeps its stored value). `null`
 * clears `cref` (or, for a non-trainer, `cpf`). A masked CPF (what `GET /auth/me` returns) is
 * dropped rather than sent, so it can never overwrite the real one.
 */
export type UpdateMeInput = Schemas["UpdateMeRequest"];

export function updateMe(input: UpdateMeInput) {
  const { cpf, ...rest } = input;
  const keep = cpf === undefined || (cpf !== null && isMaskedCpf(cpf));
  const body: UpdateMeInput = keep ? rest : { ...rest, cpf };
  return apiClient.patch<Me>("/api/auth/me", body);
}

/**
 * `POST /api/auth/password`: 204 on success; 400 `INVALID_CURRENT_PASSWORD` for a wrong current
 * password (the session stays valid — not a sign-out).
 */
export async function changePassword(input: Schemas["ChangePasswordRequest"]) {
  await apiClient.post<void>("/api/auth/password", input);
}

/**
 * `GET /api/auth/me/export`: the caller's data as the JSON file the BFF names. 413 `TOO_LARGE`
 * over vertice-api's export bounds; 429 `RATE_LIMITED` (with `retryAfter`) past the per-user
 * hourly limit.
 */
export function exportMyData() {
  return apiDownload("/api/auth/me/export", "vertice-dados.json");
}

/**
 * `DELETE /api/auth/me` with the current password: deletes the caller's own account. 400
 * `INVALID_CURRENT_PASSWORD` is a wrong password (not a sign-out); 409 `ACTIVE_CLIENTS` a trainer
 * with clients still linked. On success every token of the account stops working: sign out next.
 */
export async function deleteAccount(password: string): Promise<void> {
  const body: Schemas["DeleteAccountRequest"] = { password };
  await apiClient.delete<void>("/api/auth/me", body);
}
