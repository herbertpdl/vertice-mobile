import { fireEvent, screen, waitFor } from "@testing-library/react-native";

import { bffError, mockBff, type BffMock } from "@/test/bff";
import { renderScreen } from "@/test/render";

import { DeleteAccountScreen } from "./DeleteAccountScreen";

const mockRouter = { push: jest.fn(), back: jest.fn(), replace: jest.fn(), canGoBack: jest.fn(() => true) };
jest.mock("expo-router", () => ({
  get router() {
    return mockRouter;
  },
}));
const mockSignOut = jest.fn(async () => {});
jest.mock("@/lib/auth", () => ({ useAuth: () => ({ signOut: mockSignOut }) }));

let bff: BffMock;
afterEach(() => bff?.restore());

async function confirm(password: string) {
  await fireEvent.changeText(screen.getByLabelText("Confirme sua senha"), password);
  await fireEvent.press(screen.getByRole("button", { name: "Excluir minha conta" }));
}

describe("DeleteAccountScreen", () => {
  it("needs the password, deletes the account and signs out", async () => {
    bff = mockBff({ "DELETE /api/auth/me": new Response(null, { status: 204 }) });
    await renderScreen(<DeleteAccountScreen />);
    expect(screen.getByRole("button", { name: "Excluir minha conta" })).toBeDisabled();
    await confirm("minha-senha");
    await waitFor(() => expect(mockSignOut).toHaveBeenCalledWith("user"));
    expect(bff.calls[0].body).toEqual({ password: "minha-senha" });
  });

  it("puts a wrong password on the field", async () => {
    bff = mockBff({ "DELETE /api/auth/me": bffError(400, "INVALID_CURRENT_PASSWORD") });
    await renderScreen(<DeleteAccountScreen />);
    await confirm("errada");
    expect(await screen.findByText("Senha incorreta.")).toBeOnTheScreen();
    expect(mockSignOut).not.toHaveBeenCalled();
  });

  it("explains that students must be released first", async () => {
    bff = mockBff({ "DELETE /api/auth/me": bffError(409, "ACTIVE_CLIENTS") });
    await renderScreen(<DeleteAccountScreen />);
    await confirm("minha-senha");
    expect(await screen.findByText("Encerre o acompanhamento de cada aluno antes de excluir sua conta.")).toBeOnTheScreen();
  });
});
