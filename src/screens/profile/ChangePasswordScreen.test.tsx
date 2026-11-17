import { fireEvent, screen, waitFor } from "@testing-library/react-native";

import { bffError, mockBff, type BffMock } from "@/test/bff";
import { renderScreen } from "@/test/render";

import { ChangePasswordScreen } from "./ChangePasswordScreen";

const mockSignOut = jest.fn(async (_reason?: string) => {});
jest.mock("@/lib/auth", () => ({ useAuth: () => ({ signOut: mockSignOut }) }));

let bff: BffMock;
afterEach(() => {
  bff?.restore();
  mockSignOut.mockClear();
});

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

  it("says the change signs out every device", async () => {
    bff = mockBff({});
    await renderScreen(<ChangePasswordScreen />);
    expect(screen.getByText("Ao salvar, você sai do app em todos os aparelhos e entra de novo com a nova senha.")).toBeOnTheScreen();
  });

  it("changes the password and signs out at once, keeping drafts (passwordChanged)", async () => {
    bff = mockBff({ "POST /api/auth/password": new Response(null, { status: 204 }) });
    await renderScreen(<ChangePasswordScreen />);
    await fill("velha-senha", "nova-senha-1");
    await waitFor(() => expect(mockSignOut).toHaveBeenCalledWith("passwordChanged"));
    expect(mockSignOut).toHaveBeenCalledTimes(1);
    expect(bff.calls).toHaveLength(1);
    expect(bff.calls[0].body).toEqual({ currentPassword: "velha-senha", newPassword: "nova-senha-1" });
  });

  it("stays put on a failure, with the typed passwords kept", async () => {
    bff = mockBff({ "POST /api/auth/password": bffError(503, "UPSTREAM_UNAVAILABLE") });
    await renderScreen(<ChangePasswordScreen />);
    await fill("velha-senha", "nova-senha-1");
    expect(await screen.findByText("O serviço está indisponível no momento. Tente novamente em instantes.")).toBeOnTheScreen();
    expect(mockSignOut).not.toHaveBeenCalled();
    expect(screen.getByLabelText("Nova senha").props.value).toBe("nova-senha-1");
  });

  it("puts a wrong current password on its field", async () => {
    bff = mockBff({ "POST /api/auth/password": bffError(400, "INVALID_CURRENT_PASSWORD") });
    await renderScreen(<ChangePasswordScreen />);
    await fill("errada", "nova-senha-1");
    expect(await screen.findByText("Senha atual incorreta.")).toBeOnTheScreen();
    expect(mockSignOut).not.toHaveBeenCalled();
  });
});
