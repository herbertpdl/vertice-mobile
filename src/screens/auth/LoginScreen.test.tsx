import { act, fireEvent, screen, waitFor } from "@testing-library/react-native";

import { bffError, mockBff, type BffMock } from "@/test/bff";
import { renderScreen } from "@/test/render";

import { LoginScreen } from "./LoginScreen";

const mockSignIn = jest.fn();
let mockSessionEnded: "expired" | "passwordChanged" | null = null;
jest.mock("@/lib/auth", () => ({
  useAuth: () => ({ signIn: mockSignIn, sessionEnded: mockSessionEnded }),
}));

// Reactive like expo-router's: a link opened while the screen is mounted updates the params
// without remounting it.
let mockParams: Record<string, string | string[] | undefined> = {};
const mockParamListeners = new Set<() => void>();
jest.mock("expo-router", () => {
  const { useSyncExternalStore } = jest.requireActual("react");
  return {
    router: { push: jest.fn(), back: jest.fn() },
    useLocalSearchParams: () =>
      useSyncExternalStore(
        (listener: () => void) => {
          mockParamListeners.add(listener);
          return () => mockParamListeners.delete(listener);
        },
        () => mockParams,
      ),
  };
});

async function openLink(params: Record<string, string>) {
  await act(async () => {
    mockParams = params;
    mockParamListeners.forEach((listener) => listener());
  });
}

const session = { token: "t", user: { id: 1, name: "Ana", email: "ana@vertice.fit", role: "TRAINER" } };
let bff: BffMock;

afterEach(() => {
  bff?.restore();
  mockSignIn.mockReset();
  mockSessionEnded = null;
  mockParams = {};
});

async function fill(email: string, password: string) {
  await fireEvent.changeText(screen.getByLabelText("E-mail"), email);
  await fireEvent.changeText(screen.getByLabelText("Senha"), password);
  await fireEvent.press(screen.getByRole("button", { name: "Entrar" }));
}

describe("LoginScreen", () => {
  it("validates before calling the BFF", async () => {
    bff = mockBff({});
    await renderScreen(<LoginScreen />);
    await fill("ana.trainer", "");
    expect(await screen.findByText("Não foi possível entrar. Corrija os campos abaixo.")).toBeOnTheScreen();
    expect(screen.getByText("Informe a senha")).toBeOnTheScreen();
    expect(bff.calls).toHaveLength(0);
  });

  it("fills in the e-mail from the web's \"Abrir o app\" link", async () => {
    bff = mockBff({ "POST /api/auth/login": session });
    mockParams = { email: " bia+treino@vertice.fit " };
    await renderScreen(<LoginScreen />);
    expect(screen.getByLabelText("E-mail").props.value).toBe("bia+treino@vertice.fit");
    await fireEvent.changeText(screen.getByLabelText("Senha"), "segredo123");
    await fireEvent.press(screen.getByRole("button", { name: "Entrar" }));
    await waitFor(() => expect(bff.calls[0]?.body).toEqual({ email: "bia+treino@vertice.fit", password: "segredo123" }));
  });

  it("fills in the e-mail when the link opens while the login is already on screen", async () => {
    bff = mockBff({});
    await renderScreen(<LoginScreen />);
    expect(screen.getByLabelText("E-mail").props.value).toBe("");
    await openLink({ email: "bia@vertice.fit" });
    await waitFor(() => expect(screen.getByLabelText("E-mail").props.value).toBe("bia@vertice.fit"));
  });

  it("ignores a repeated email parameter", async () => {
    bff = mockBff({});
    mockParams = { email: ["a@vertice.fit", "b@vertice.fit"] };
    await renderScreen(<LoginScreen />);
    expect(screen.getByLabelText("E-mail").props.value).toBe("");
  });

  it("signs in with the session the BFF returns (e-mail trimmed, no token sent)", async () => {
    bff = mockBff({ "POST /api/auth/login": session });
    await renderScreen(<LoginScreen />);
    await fill("  ana@vertice.fit ", "segredo123");
    await waitFor(() => expect(mockSignIn).toHaveBeenCalledWith(session));
    expect(bff.calls[0].body).toEqual({ email: "ana@vertice.fit", password: "segredo123" });
    expect(bff.calls[0].headers.Authorization).toBeUndefined();
  });

  it("says the credentials are wrong on a 401", async () => {
    bff = mockBff({ "POST /api/auth/login": bffError(401, "UNAUTHORIZED") });
    await renderScreen(<LoginScreen />);
    await fill("ana@vertice.fit", "errada");
    expect(await screen.findByText("E-mail ou senha inválidos")).toBeOnTheScreen();
    expect(mockSignIn).not.toHaveBeenCalled();
  });

  it("says the account is suspended on a 403 ACCOUNT_SUSPENDED (admin-panel R41, E18)", async () => {
    bff = mockBff({ "POST /api/auth/login": bffError(403, "ACCOUNT_SUSPENDED") });
    await renderScreen(<LoginScreen />);
    await fill("ana@vertice.fit", "segredo123");
    expect(await screen.findByText("Sua conta está suspensa. Entre em contato com o suporte.")).toBeOnTheScreen();
    expect(mockSignIn).not.toHaveBeenCalled();
  });

  it("shows the wrong-role notice on a 403 ADMIN_LOGIN_ELSEWHERE, not the BFF's message (R3, E2)", async () => {
    bff = mockBff({
      "POST /api/auth/login": Response.json(
        { error: { code: "ADMIN_LOGIN_ELSEWHERE", message: "O acesso de alunos é feito somente pelo aplicativo Vertice." } },
        { status: 403 },
      ),
    });
    await renderScreen(<LoginScreen />);
    await fill("admin@vertice.fit", "segredo123");
    expect(
      await screen.findByText(
        "Este app é para treinadores e alunos. Contas de administração não têm acesso pelo aplicativo.",
      ),
    ).toBeOnTheScreen();
    expect(screen.queryByText(/O acesso de alunos/)).toBeNull();
    expect(mockSignIn).not.toHaveBeenCalled();
  });

  it("keeps the generic copy for an unknown 403 code from a newer BFF", async () => {
    bff = mockBff({ "POST /api/auth/login": bffError(403, "SOME_FUTURE_CODE") });
    await renderScreen(<LoginScreen />);
    await fill("ana@vertice.fit", "segredo123");
    expect(await screen.findByText("Não foi possível entrar")).toBeOnTheScreen();
  });

  it("says how long to wait on a 429", async () => {
    bff = mockBff({ "POST /api/auth/login": bffError(429, "RATE_LIMITED", { "Retry-After": "120" }) });
    await renderScreen(<LoginScreen />);
    await fill("ana@vertice.fit", "errada");
    expect(await screen.findByText("Muitas tentativas. Tente novamente em 2 minutos.")).toBeOnTheScreen();
  });

  it("says the session ended when the BFF ended it", async () => {
    mockSessionEnded = "expired";
    bff = mockBff({});
    await renderScreen(<LoginScreen />);
    expect(screen.getByText("Sua sessão terminou. Entre novamente.")).toBeOnTheScreen();
  });

  it("asks for the new password after a password change on this phone", async () => {
    mockSessionEnded = "passwordChanged";
    bff = mockBff({});
    await renderScreen(<LoginScreen />);
    expect(screen.getByText("Senha alterada. Entre com a nova senha.")).toBeOnTheScreen();
    expect(screen.queryByText("Sua sessão terminou. Entre novamente.")).toBeNull();
  });

  it("sends one request when the keyboard's 'go' follows a tap", async () => {
    let answer!: (r: Response) => void;
    bff = mockBff({ "POST /api/auth/login": () => new Promise<Response>((r) => (answer = r)) });
    await renderScreen(<LoginScreen />);
    await fireEvent.changeText(screen.getByLabelText("E-mail"), "ana@vertice.fit");
    await fireEvent.changeText(screen.getByLabelText("Senha"), "segredo123");
    await fireEvent.press(screen.getByRole("button", { name: "Entrar" }));
    await fireEvent(screen.getByLabelText("Senha"), "submitEditing");
    answer(Response.json(session));
    await waitFor(() => expect(mockSignIn).toHaveBeenCalledTimes(1));
    expect(bff.calls.filter((c) => c.route === "POST /api/auth/login")).toHaveLength(1);
  });
});

