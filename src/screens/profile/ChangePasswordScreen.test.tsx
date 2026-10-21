import { fireEvent, screen, waitFor } from "@testing-library/react-native";

import { bffError, mockBff, type BffMock } from "@/test/bff";
import { renderScreen } from "@/test/render";

import { ChangePasswordScreen } from "./ChangePasswordScreen";

const mockRouter = { push: jest.fn(), back: jest.fn(), replace: jest.fn(), canGoBack: jest.fn(() => true) };
jest.mock("expo-router", () => ({
  get router() {
    return mockRouter;
  },
}));

let bff: BffMock;
afterEach(() => bff?.restore());

async function fill(current: string, next: string, confirm = next) {
  await fireEvent.changeText(screen.getByLabelText("Senha atual"), current);
  await fireEvent.changeText(screen.getByLabelText("Nova senha"), next);
  await fireEvent.changeText(screen.getByLabelText("Confirmar nova senha"), confirm);
  await fireEvent.press(screen.getByRole("button", { name: "Salvar nova senha" }));
}

describe("ChangePasswordScreen", () => {
  it("validates the new password and its confirmation", async () => {
    bff = mockBff({});
    await renderScreen(<ChangePasswordScreen />);
    await fill("velha", "curta");
    expect(await screen.findByText("A senha deve ter no mínimo 8 caracteres")).toBeOnTheScreen();
    await fill("velha", "nova-senha-1", "nova-senha-2");
    expect(await screen.findByText("As senhas não coincidem")).toBeOnTheScreen();
    expect(bff.calls).toHaveLength(0);
  });

  it("changes the password and goes back", async () => {
    bff = mockBff({ "POST /api/auth/password": new Response(null, { status: 204 }) });
    await renderScreen(<ChangePasswordScreen />);
    await fill("velha-senha", "nova-senha-1");
    await waitFor(() => expect(mockRouter.back).toHaveBeenCalled());
    expect(bff.calls[0].body).toEqual({ currentPassword: "velha-senha", newPassword: "nova-senha-1" });
    expect(screen.getByText("Senha alterada.")).toBeOnTheScreen();
  });

  it("puts a wrong current password on its field", async () => {
    bff = mockBff({ "POST /api/auth/password": bffError(400, "INVALID_CURRENT_PASSWORD") });
    await renderScreen(<ChangePasswordScreen />);
    await fill("errada", "nova-senha-1");
    expect(await screen.findByText("Senha atual incorreta.")).toBeOnTheScreen();
    expect(mockRouter.back).not.toHaveBeenCalled();
  });
});
