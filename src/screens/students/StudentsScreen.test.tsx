import { fireEvent, screen, waitFor } from "@testing-library/react-native";
import { Share } from "react-native";
import * as Clipboard from "expo-clipboard";

import type { ClientSummary } from "@/lib/api/types";
import { bffError, mockBff, type BffMock } from "@/test/bff";
import { renderScreen } from "@/test/render";

import { StudentsScreen } from "./StudentsScreen";

const mockPush = jest.fn();
jest.mock("expo-router", () => ({ router: { push: (...a: unknown[]) => mockPush(...a) } }));

const student = (id: number, name: string, plan: string | null): ClientSummary => ({
  id,
  name,
  activePlanCount: plan === null ? 0 : 1,
  currentPlan: plan === null ? null : { id, name: plan, endDate: "2026-12-01" },
  lastWorkoutAt: null,
  weekActivity: [
    { date: "2026-10-19", dayOfWeek: "MONDAY", completed: true },
    { date: "2026-10-20", dayOfWeek: "TUESDAY", completed: false },
  ],
});
const roster = [student(1, "Marina Costa", "Hipertrofia II"), student(2, "Diego Martins", null), student(3, "Júlia Prado", "Full Body")];

let bff: BffMock;
afterEach(() => bff?.restore());

describe("StudentsScreen", () => {
  it("lists the roster with the count, and opens a student", async () => {
    bff = mockBff({ "GET /api/clients": roster });
    await renderScreen(<StudentsScreen />);
    expect(await screen.findByText("3 alunos cadastrados")).toBeOnTheScreen();
    expect(screen.getAllByLabelText("Esta semana: Segunda concluído, Terça pendente")).toHaveLength(3);
    await fireEvent.press(screen.getByRole("button", { name: /^Marina Costa, Hipertrofia II/ }));
    expect(mockPush).toHaveBeenCalledWith("/alunos/1");
  });

  it("filters by plan and searches ignoring accents", async () => {
    bff = mockBff({ "GET /api/clients": roster });
    await renderScreen(<StudentsScreen />);
    await screen.findByText("3 alunos cadastrados");
    await fireEvent.press(screen.getByRole("button", { name: "Sem plano" }));
    expect(screen.getByText("1 aluno sem plano")).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: /^Diego Martins, Sem plano ativo/ })).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole("button", { name: "Todos" }));
    await fireEvent.changeText(screen.getByLabelText("Buscar aluno"), "julia");
    expect(screen.getByRole("button", { name: /^Júlia Prado/ })).toBeOnTheScreen();
  });

  it("clears an empty search from the empty state", async () => {
    bff = mockBff({ "GET /api/clients": roster });
    await renderScreen(<StudentsScreen />);
    await screen.findByText("3 alunos cadastrados");
    await fireEvent.changeText(screen.getByLabelText("Buscar aluno"), "anderson");
    expect(screen.getByText("Nenhum aluno encontrado")).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole("button", { name: "Limpar busca" }));
    expect(screen.getByText("3 alunos cadastrados")).toBeOnTheScreen();
  });

  it("invites the first student when the roster is empty", async () => {
    bff = mockBff({ "GET /api/clients": [] });
    await renderScreen(<StudentsScreen />);
    expect(await screen.findByText("Nenhum aluno ainda")).toBeOnTheScreen();
  });

  it("shows the error state when the roster can't load", async () => {
    bff = mockBff({ "GET /api/clients": bffError(503, "UPSTREAM_UNAVAILABLE") });
    await renderScreen(<StudentsScreen />);
    expect(await screen.findByText("Algo deu errado")).toBeOnTheScreen();
  });

  it("creates a student and shows the access link once", async () => {
    let roster2 = roster;
    bff = mockBff({
      "GET /api/clients": () => Response.json(roster2),
      "POST /api/clients": ({ body }) => {
        roster2 = [...roster, student(4, "Bruno Ferreira", null)];
        return Response.json({
          id: 4,
          name: (body as { name: string }).name,
          email: "bruno@x.com",
          cpf: "***.***.***-25",
          role: "CLIENT",
          setup: { token: "tok-1", expiresAt: "2099-01-01T12:00:00Z" },
        });
      },
    });
    await renderScreen(<StudentsScreen />);
    await screen.findByText("3 alunos cadastrados");
    await fireEvent.press(screen.getByRole("button", { name: "Novo aluno" }));
    await fireEvent.press(screen.getByRole("button", { name: "Criar aluno" }));
    expect(await screen.findByText("Informe o nome")).toBeOnTheScreen();
    await fireEvent.changeText(screen.getByLabelText("Nome completo"), "Bruno Ferreira");
    await fireEvent.changeText(screen.getByLabelText("E-mail"), "bruno@x.com");
    await fireEvent.changeText(screen.getByLabelText("CPF"), "52998224725");
    await fireEvent.press(screen.getByRole("button", { name: "Criar aluno" }));
    expect(await screen.findByText("Bruno Ferreira foi adicionado")).toBeOnTheScreen();
    expect(bff.calls.find((c) => c.route === "POST /api/clients")?.body).toEqual({
      name: "Bruno Ferreira",
      email: "bruno@x.com",
      cpf: "52998224725",
    });
    await fireEvent.press(screen.getByRole("button", { name: "Copiar link" }));
    expect(Clipboard.setStringAsync).toHaveBeenCalledWith("http://localhost:5173/definir-senha?token=tok-1");
    expect(await screen.findByText("Link copiado.")).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "Link copiado" })).toBeOnTheScreen();
    const share = jest.spyOn(Share, "share").mockResolvedValue({ action: "sharedAction" });
    await fireEvent.press(screen.getByRole("button", { name: "Compartilhar link" }));
    expect(share).toHaveBeenCalledWith({ message: expect.stringContaining("/definir-senha?token=tok-1") });
    expect(bff.calls.some((c) => c.route === "GET /api/dashboard")).toBe(false); // not mounted here, but invalidated
    await fireEvent.press(screen.getByRole("button", { name: "Concluir" }));
    await waitFor(() => expect(screen.getByText("4 alunos cadastrados")).toBeOnTheScreen());
    // Reopening starts from an empty form, with no token left.
    await fireEvent.press(screen.getByRole("button", { name: "Novo aluno" }));
    expect(screen.getByLabelText("Nome completo").props.value).toBe("");
    expect(screen.queryByText(/definir-senha/)).toBeNull();
  });

  it("tells the trainer when the link couldn't be issued", async () => {
    bff = mockBff({
      "GET /api/clients": roster,
      "POST /api/clients": { id: 4, name: "Bruno Ferreira", email: "b@x.com", cpf: "", role: "CLIENT", setup: null },
    });
    await renderScreen(<StudentsScreen />);
    await screen.findByText("3 alunos cadastrados");
    await fireEvent.press(screen.getByRole("button", { name: "Novo aluno" }));
    await fireEvent.changeText(screen.getByLabelText("Nome completo"), "Bruno Ferreira");
    await fireEvent.changeText(screen.getByLabelText("E-mail"), "b@x.com");
    await fireEvent.changeText(screen.getByLabelText("CPF"), "52998224725");
    await fireEvent.press(screen.getByRole("button", { name: "Criar aluno" }));
    expect(await screen.findByText("Não foi possível gerar o link de acesso. Tente gerar de novo.")).toBeOnTheScreen();
    expect(screen.queryByRole("button", { name: "Copiar link" })).toBeNull();
  });

  it("issues the link inline when creation couldn't", async () => {
    bff = mockBff({
      "GET /api/clients": roster,
      "POST /api/clients": { id: 4, name: "Bruno Ferreira", email: "b@x.com", cpf: "", role: "CLIENT", setup: null },
      "POST /api/clients/4/setup-token": { token: "tok-2", expiresAt: "2099-01-01T12:00:00Z" },
    });
    await renderScreen(<StudentsScreen />);
    await screen.findByText("3 alunos cadastrados");
    await fireEvent.press(screen.getByRole("button", { name: "Novo aluno" }));
    await fireEvent.changeText(screen.getByLabelText("Nome completo"), "Bruno Ferreira");
    await fireEvent.changeText(screen.getByLabelText("E-mail"), "b@x.com");
    await fireEvent.changeText(screen.getByLabelText("CPF"), "52998224725");
    await fireEvent.press(screen.getByRole("button", { name: "Criar aluno" }));
    await fireEvent.press(await screen.findByRole("button", { name: "Gerar link de acesso" }));
    expect(await screen.findByRole("button", { name: "Copiar link" })).toBeOnTheScreen();
  });

  it("shows a taken e-mail or CPF on the e-mail field", async () => {
    bff = mockBff({ "GET /api/clients": roster, "POST /api/clients": bffError(409, "CONFLICT") });
    await renderScreen(<StudentsScreen />);
    await screen.findByText("3 alunos cadastrados");
    await fireEvent.press(screen.getByRole("button", { name: "Novo aluno" }));
    await fireEvent.changeText(screen.getByLabelText("Nome completo"), "Bruno Ferreira");
    await fireEvent.changeText(screen.getByLabelText("E-mail"), "b@x.com");
    await fireEvent.changeText(screen.getByLabelText("CPF"), "52998224725");
    await fireEvent.press(screen.getByRole("button", { name: "Criar aluno" }));
    expect(await screen.findByText("E-mail ou CPF já cadastrado")).toBeOnTheScreen();
    expect(screen.getByLabelText("E-mail").props.accessibilityHint).toBe("E-mail ou CPF já cadastrado");
  });

  it("fails fast offline instead of locking the sheet", async () => {
    bff = mockBff({ "GET /api/clients": roster });
    await renderScreen(<StudentsScreen />);
    await screen.findByText("3 alunos cadastrados");
    bff.restore();
    const realFetch = global.fetch;
    global.fetch = (async () => {
      throw new TypeError("Network request failed");
    }) as typeof fetch;
    const { onlineManager } = jest.requireActual("@tanstack/react-query");
    onlineManager.setOnline(false);
    try {
      await fireEvent.press(screen.getByRole("button", { name: "Novo aluno" }));
      await fireEvent.changeText(screen.getByLabelText("Nome completo"), "Bruno Ferreira");
      await fireEvent.changeText(screen.getByLabelText("E-mail"), "b@x.com");
      await fireEvent.changeText(screen.getByLabelText("CPF"), "52998224725");
      await fireEvent.press(screen.getByRole("button", { name: "Criar aluno" }));
      expect(await screen.findByText("Não foi possível criar o aluno")).toBeOnTheScreen();
      expect(screen.getByRole("button", { name: "Cancelar" })).toBeEnabled();
    } finally {
      onlineManager.setOnline(true);
      global.fetch = realFetch;
    }
  });
});

