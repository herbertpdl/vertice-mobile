import { mockBff, bffError } from "@/test/bff";

import { login, register, setupPassword } from "./auth";
import { configureApiSession } from "./client";
import { fetchLegalVersions } from "./legal";

const onUnauthorized = jest.fn();
beforeEach(() => configureApiSession({ getToken: () => "session-token", onUnauthorized }));

describe("the public routes", () => {
  it.each([
    ["login", "POST /api/auth/login", () => login({ email: "a@b.c", password: "x" })],
    ["register", "POST /api/auth/register", () => register({ name: "A", email: "a@b.c", cpf: "52998224725", password: "segredo123", acceptedTermsVersion: "v1" })],
    ["setupPassword", "POST /api/auth/password/setup", () => setupPassword({ token: "t", newPassword: "segredo123" })],
    ["fetchLegalVersions", "GET /api/legal/versions", () => fetchLegalVersions()],
  ] as const)("%s sends no token and a 401 doesn't sign out", async (_name, route, call) => {
    const bff = mockBff({ [route]: bffError(401, "UNAUTHORIZED") });
    await expect(call()).rejects.toMatchObject({ status: 401 });
    expect(bff.calls[0].headers.Authorization).toBeUndefined();
    expect(onUnauthorized).not.toHaveBeenCalled();
    bff.restore();
  });

  it("register always asks for a trainer account", async () => {
    const bff = mockBff({ "POST /api/auth/register": { token: "t", user: {} } });
    await register({ name: "A", email: "a@b.c", cpf: "52998224725", password: "segredo123", acceptedTermsVersion: "v1" });
    expect(bff.calls[0].body).toMatchObject({ role: "TRAINER" });
    bff.restore();
  });
});
