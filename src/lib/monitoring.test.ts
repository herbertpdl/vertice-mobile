import type { ErrorEvent } from "@sentry/react-native";

import { scrubBreadcrumb, scrubEvent, scrubText, scrubUrl } from "./monitoring";

jest.mock("@sentry/react-native", () => ({ init: jest.fn(), captureException: jest.fn() }));

describe("monitoring scrubbers", () => {
  it("removes e-mails, CPFs and tokens from text", () => {
    expect(scrubText("ana@vertice.fit com CPF 529.982.247-25 e 52998224725")).toBe("[email] com CPF [cpf] e [cpf]");
    expect(scrubText("Authorization: Bearer abc.def-123")).toBe("Authorization: Bearer [token]");
    expect(scrubText("token eyJhbGciOi.eyJzdWIiOjF9.c2lnbmF0dXJl")).toBe("token [token]");
  });

  it("drops query strings (a search term is a student's name)", () => {
    expect(scrubUrl("https://bff.vertice.fit/api/exercises?q=Marina#x")).toBe("https://bff.vertice.fit/api/exercises");
  });

  it("strips the user and request payloads from an event", () => {
    const event = {
      type: undefined,
      message: "falhou para ana@vertice.fit",
      user: { id: "1", email: "ana@vertice.fit" },
      request: { url: "https://bff/api/clients?q=Ana", method: "GET", data: '{"cpf":"52998224725"}', headers: { Authorization: "Bearer x" } },
      extra: { body: { email: "ana@vertice.fit" } },
      breadcrumbs: [{ category: "touch", message: "Marina Costa" }, { category: "http", data: { url: "https://bff/api/exercises?q=Rem", body: "x" } }],
    } as unknown as ErrorEvent;
    const scrubbed = scrubEvent(event);
    expect(scrubbed.user).toBeUndefined();
    expect(scrubbed.request).toEqual({ url: "https://bff/api/clients", method: "GET" });
    expect(scrubbed.message).toBe("falhou para [email]");
    expect(scrubbed.extra).toEqual({ body: { email: "[email]" } });
    expect(scrubbed.breadcrumbs).toEqual([{ category: "http", message: undefined, data: { url: "https://bff/api/exercises" } }]);
  });

  it("drops touch and console breadcrumbs", () => {
    expect(scrubBreadcrumb({ category: "touch", message: "Supino" })).toBeNull();
    expect(scrubBreadcrumb({ category: "console", message: "x" })).toBeNull();
    expect(scrubBreadcrumb({ category: "navigation", data: { to: "/alunos/7?tab=feedback", from: "/" } })).toEqual({
      category: "navigation",
      message: undefined,
      data: { to: "/alunos/7", from: "/" },
    });
  });
});
