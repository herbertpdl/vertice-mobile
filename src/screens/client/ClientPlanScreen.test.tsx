import { fireEvent, screen } from "@testing-library/react-native";

import { mockBff, type BffMock } from "@/test/bff";
import { renderScreen } from "@/test/render";

import { ClientPlanScreen, readOnlyNotice } from "./ClientPlanScreen";
import { planDetail, workout } from "./fixtures";

const mockPush = jest.fn();
jest.mock("expo-router", () => ({
  router: { push: (...args: unknown[]) => mockPush(...args), back: jest.fn(), canGoBack: () => true },
  useLocalSearchParams: () => ({ id: "1" }),
}));
jest.mock("@/lib/format", () => ({ ...jest.requireActual("@/lib/format"), todayLocalIso: () => "2026-12-21" }));

let bff: BffMock;
afterEach(() => bff?.restore());

describe("readOnlyNotice", () => {
  it("explains an ended or upcoming plan, and says nothing for the active one", () => {
    expect(readOnlyNotice("completed", "2026-09-01")).toMatch(/^Plano encerrado/);
    expect(readOnlyNotice("scheduled", "2026-12-01")).toBe("Este plano começa em 01 dez. Até lá, é só para consulta.");
    expect(readOnlyNotice("active", "2026-09-01")).toBeUndefined();
  });
});

describe("ClientPlanScreen", () => {
  it("shows an ended plan read-only: no add-workout, workouts open their read-only view", async () => {
    bff = mockBff({ "GET /api/training-plans/1": planDetail([workout(11, "MONDAY", "Treino A")]) });
    await renderScreen(<ClientPlanScreen />);
    expect(await screen.findByText(/^Plano encerrado/)).toBeOnTheScreen();
    expect(screen.queryByText("Adicionar treino")).toBeNull();
    expect(screen.getByLabelText("Terça: descanso")).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole("button", { name: "Segunda: Treino A" }));
    expect(mockPush).toHaveBeenCalledWith("/aluno/treinos/11");
  });
});
