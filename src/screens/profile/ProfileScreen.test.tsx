import { act, fireEvent, screen, waitFor } from "@testing-library/react-native";

import type { Me } from "@/lib/api/types";
import { bffError, mockBff, type BffMock } from "@/test/bff";
import { renderScreen } from "@/test/render";

import { ProfileScreen } from "./ProfileScreen";

const mockRouter = { push: jest.fn(), back: jest.fn(), replace: jest.fn(), canGoBack: jest.fn(() => true) };
jest.mock("expo-router", () => ({
  get router() {
    return mockRouter;
  },
}));
const mockSignOut = jest.fn();
const me: Me = {
  id: 1,
  name: "Ana Ribeiro",
  email: "ana@vertice.fit",
  cpf: "***.***.***-25",
  cref: "012345-G/SP",
  role: "TRAINER",
  whatsapp: "",
  instagram: "",
  showEmail: false,
  showWhatsapp: false,
  showInstagram: false,
  consent: { termsVersion: "2026-01", termsAcceptedAt: "2026-01-01T00:00:00Z", healthDataVersion: null, healthDataConsentAt: null },
};
jest.mock("@/lib/auth", () => ({
  ...jest.requireActual("@/lib/auth"),
  useAuth: () => ({ signOut: mockSignOut }),
  useMe: () => ({ data: me, isError: false, isFetching: false, refetch: jest.fn() }),
}));
const mockShareExport = jest.fn();
jest.mock("@/lib/exportData", () => ({ shareExport: (...args: unknown[]) => mockShareExport(...args) }));
jest.mock("@/lib/legal", () => ({
  ...jest.requireActual("@/lib/legal"),
  openLegalPage: jest.fn(),
}));

let bff: BffMock;
afterEach(() => bff?.restore());

describe("ProfileScreen", () => {
  it("shows the account and routes every row", async () => {
    bff = mockBff({});
    await renderScreen(<ProfileScreen />);
    expect(screen.getByText("Ana Ribeiro")).toBeOnTheScreen();
    expect(screen.getByText("CREF 012345-G/SP")).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole("button", { name: "Alterar senha" }));
    expect(mockRouter.push).toHaveBeenCalledWith("/perfil/senha");
    await fireEvent.press(screen.getByRole("button", { name: "Excluir conta" }));
    expect(mockRouter.push).toHaveBeenCalledWith("/perfil/excluir-conta");
    await fireEvent.press(screen.getByRole("button", { name: "Sair" }));
    expect(mockSignOut).toHaveBeenCalledWith("user");
    expect(screen.getByRole("link", { name: "Termos de uso" })).toBeOnTheScreen();
  });

  it("exports the data file to the share sheet", async () => {
    bff = mockBff({
      "GET /api/auth/me/export": new Response('{"a":1}', { headers: { "Content-Disposition": 'attachment; filename="vertice-1.json"' } }),
    });
    await renderScreen(<ProfileScreen />);
    await fireEvent.press(screen.getByRole("button", { name: "Exportar meus dados" }));
    await waitFor(() => expect(mockShareExport).toHaveBeenCalledWith({ text: '{"a":1}', filename: "vertice-1.json" }));
  });

  it("says when the export limit was hit", async () => {
    bff = mockBff({ "GET /api/auth/me/export": bffError(429, "RATE_LIMITED", { "Retry-After": "1800" }) });
    await renderScreen(<ProfileScreen />);
    await fireEvent.press(screen.getByRole("button", { name: "Exportar meus dados" }));
    expect(await screen.findByText(/^Limite de exportações atingido\./)).toBeOnTheScreen();
    expect(mockShareExport).not.toHaveBeenCalled();
  });

  it("edits the profile in the sheet, sending only what changed", async () => {
    bff = mockBff({ "PATCH /api/auth/me": ({ body }) => Response.json({ ...me, ...(body as object) }) });
    await renderScreen(<ProfileScreen />);
    await fireEvent.press(screen.getByRole("button", { name: "Editar perfil" }));
    await fireEvent.changeText(screen.getByLabelText("CREF"), "");
    await fireEvent.changeText(screen.getByLabelText("CPF"), "52998224725");
    expect(screen.getByLabelText("CPF")).toHaveDisplayValue("529.982.247-25");
    await fireEvent.press(screen.getByRole("button", { name: "Salvar" }));
    expect(await screen.findByText("Perfil atualizado.")).toBeOnTheScreen();
    expect(bff.calls.find((c) => c.route === "PATCH /api/auth/me")?.body).toEqual({ cpf: "52998224725", cref: null });
  });

  it("lets a trainer choose which contacts their clients see (R77, R78)", async () => {
    bff = mockBff({ "PATCH /api/auth/me": ({ body }) => Response.json({ ...me, ...(body as object) }) });
    await renderScreen(<ProfileScreen />);
    await fireEvent.press(screen.getByRole("button", { name: "Editar perfil" }));
    expect(screen.getByRole("header", { name: "Contato para alunos" })).toBeOnTheScreen();
    await fireEvent.changeText(screen.getByLabelText("WhatsApp"), "11987654321");
    expect(screen.getByLabelText("WhatsApp")).toHaveDisplayValue("(11) 98765-4321");
    await fireEvent.changeText(screen.getByLabelText("Instagram"), "@ana.treinos");
    await fireEvent(screen.getByRole("switch", { name: "Mostrar WhatsApp aos alunos" }), "valueChange", true);
    await fireEvent.press(screen.getByRole("button", { name: "Salvar" }));
    expect(await screen.findByText("Perfil atualizado.")).toBeOnTheScreen();
    expect(bff.calls.find((c) => c.route === "PATCH /api/auth/me")?.body).toEqual({
      whatsapp: "11987654321",
      instagram: "ana.treinos",
      showWhatsapp: true,
    });
  });

  it("keeps the sheet open with the copy on a taken e-mail", async () => {
    bff = mockBff({ "PATCH /api/auth/me": bffError(409, "CONFLICT") });
    await renderScreen(<ProfileScreen />);
    await fireEvent.press(screen.getByRole("button", { name: "Editar perfil" }));
    await fireEvent.changeText(screen.getByLabelText("E-mail"), "outra@vertice.fit");
    await fireEvent.press(screen.getByRole("button", { name: "Salvar" }));
    expect(await screen.findByText("E-mail ou CPF já cadastrado")).toBeOnTheScreen();
  });

  it("has no profile editing for a client (their account comes from their trainer)", async () => {
    Object.assign(me, { role: "CLIENT", cref: "" });
    try {
      bff = mockBff({ "GET /api/auth/me/trainer": { name: "Rafael Lima", email: "", whatsapp: "", instagram: "" } });
      await renderScreen(<ProfileScreen />);
      await screen.findByText("Rafael Lima");
      expect(screen.queryByRole("button", { name: "Editar perfil" })).toBeNull();
      expect(screen.getByRole("button", { name: "Alterar senha" })).toBeOnTheScreen();
    } finally {
      Object.assign(me, { role: "TRAINER", cref: "012345-G/SP" });
    }
  });

  it("shows a client their trainer with the contacts the trainer shows (R74–R76)", async () => {
    Object.assign(me, { role: "CLIENT", cref: "" });
    try {
      bff = mockBff({ "GET /api/auth/me/trainer": { name: "Rafael Lima", email: "", whatsapp: "11987654321", instagram: "rafael.treina" } });
      await renderScreen(<ProfileScreen />);
      expect(await screen.findByText("Rafael Lima")).toBeOnTheScreen();
      expect(screen.getByRole("header", { name: "SEU TREINADOR" })).toBeOnTheScreen();
      expect(screen.getByRole("link", { name: "WhatsApp · (11) 98765-4321" })).toBeOnTheScreen();
      expect(screen.getByRole("link", { name: "@rafael.treina" })).toBeOnTheScreen();
    } finally {
      Object.assign(me, { role: "TRAINER", cref: "012345-G/SP" });
    }
  });

  it("leaves the trainer card out when the client has no active trainer", async () => {
    Object.assign(me, { role: "CLIENT", cref: "" });
    try {
      bff = mockBff({ "GET /api/auth/me/trainer": bffError(404, "NOT_FOUND") });
      await renderScreen(<ProfileScreen />);
      await waitFor(() => expect(bff.calls.some((c) => c.route === "GET /api/auth/me/trainer")).toBe(true));
      await act(async () => {});
      expect(screen.queryByText("SEU TREINADOR")).toBeNull();
      expect(screen.getByRole("button", { name: "Alterar senha" })).toBeOnTheScreen();
    } finally {
      Object.assign(me, { role: "TRAINER", cref: "012345-G/SP" });
    }
  });

  it("never asks a trainer for their own trainer", async () => {
    bff = mockBff({});
    await renderScreen(<ProfileScreen />);
    await act(async () => {});
    expect(bff.calls.some((c) => c.route === "GET /api/auth/me/trainer")).toBe(false);
  });
});
