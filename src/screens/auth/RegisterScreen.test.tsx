import { fireEvent, screen, waitFor } from "@testing-library/react-native";

import { mockBff, type BffMock } from "@/test/bff";
import { renderScreen } from "@/test/render";

import { RegisterScreen } from "./RegisterScreen";

const mockSignIn = jest.fn();
jest.mock("@/lib/auth", () => ({
  ...jest.requireActual("@/lib/auth/useSessionGate"),
  useAuth: () => ({ signIn: mockSignIn }),
}));
jest.mock("expo-router", () => ({ router: { push: jest.fn(), back: jest.fn(), canGoBack: () => true } }));
jest.mock("@/lib/legal", () => ({ openLegalPage: jest.fn(), LEGAL_PAGE_TITLES: {} }));

let bff: BffMock;
afterEach(() => {
  bff?.restore();
  mockSignIn.mockReset();
});

async function fillValid() {
  await fireEvent.changeText(screen.getByLabelText("Nome completo"), "Ana Souza");
  await fireEvent.changeText(screen.getByLabelText("E-mail"), "ana@vertice.fit");
  await fireEvent.changeText(screen.getByLabelText("CPF"), "52998224725");
  await fireEvent.changeText(screen.getByLabelText("Senha"), "segredo123");
  await fireEvent.changeText(screen.getByLabelText("Confirmar senha"), "segredo123");
}

describe("RegisterScreen", () => {
  it("masks the CPF as it is typed", async () => {
    bff = mockBff({ "GET /api/legal/versions": { terms: "2026-10-draft", healthData: "2026-10-draft" } });
    await renderScreen(<RegisterScreen />);
    await fireEvent.changeText(screen.getByLabelText("CPF"), "52998224725");
    expect(screen.getByLabelText("CPF").props.value).toBe("529.982.247-25");
  });

  it("requires the terms to be accepted", async () => {
    bff = mockBff({ "GET /api/legal/versions": { terms: "2026-10-draft", healthData: "2026-10-draft" } });
    await renderScreen(<RegisterScreen />);
    await fillValid();
    await fireEvent.press(screen.getByRole("button", { name: "Criar conta" }));
    expect(await screen.findByText("É necessário aceitar os termos de uso")).toBeOnTheScreen();
    expect(bff.calls.filter((c) => c.route === "POST /api/auth/register")).toHaveLength(0);
  });

  it("registers a trainer with the BFF's current terms version and signs in", async () => {
    const session = { token: "t", user: { id: 9, name: "Ana Souza", email: "ana@vertice.fit", role: "TRAINER" } };
    bff = mockBff({
      "GET /api/legal/versions": { terms: "2026-10-draft", healthData: "2026-10-draft" },
      "POST /api/auth/register": session,
    });
    await renderScreen(<RegisterScreen />);
    await fillValid();
    await fireEvent.press(screen.getByRole("checkbox"));
    await fireEvent.press(screen.getByRole("button", { name: "Criar conta" }));
    await waitFor(() => expect(mockSignIn).toHaveBeenCalledWith(session));
    expect(bff.calls.find((c) => c.route === "POST /api/auth/register")?.body).toEqual({
      name: "Ana Souza",
      email: "ana@vertice.fit",
      cpf: "52998224725",
      password: "segredo123",
      acceptedTermsVersion: "2026-10-draft",
      role: "TRAINER",
    });
  });
});
