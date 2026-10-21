import { fireEvent, screen, waitFor } from "@testing-library/react-native";

import { bffError, mockBff, type BffMock } from "@/test/bff";
import { renderScreen } from "@/test/render";

import { LoginScreen } from "./LoginScreen";

const mockSignIn = jest.fn();
let mockSessionExpired = false;
jest.mock("@/lib/auth", () => ({
  useAuth: () => ({ signIn: mockSignIn, sessionExpired: mockSessionExpired }),
}));

jest.mock("expo-router", () => ({ router: { push: jest.fn(), back: jest.fn() } }));

const session = { token: "t", user: { id: 1, name: "Ana", email: "ana@vertice.fit", role: "TRAINER" } };
let bff: BffMock;

afterEach(() => {
  bff?.restore();
  mockSignIn.mockReset();
  mockSessionExpired = false;
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

  it("says how long to wait on a 429", async () => {
    bff = mockBff({ "POST /api/auth/login": bffError(429, "RATE_LIMITED", { "Retry-After": "120" }) });
    await renderScreen(<LoginScreen />);
    await fill("ana@vertice.fit", "errada");
    expect(await screen.findByText("Muitas tentativas. Tente novamente em 2 minutos.")).toBeOnTheScreen();
  });

  it("explains an expired session", async () => {
    mockSessionExpired = true;
    bff = mockBff({});
    await renderScreen(<LoginScreen />);
    expect(screen.getByText("Sua sessão expirou. Entre novamente.")).toBeOnTheScreen();
  });
});
