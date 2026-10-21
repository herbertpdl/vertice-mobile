import { fireEvent, screen, waitFor } from "@testing-library/react-native";

import { mockBff, type BffMock } from "@/test/bff";
import { renderScreen } from "@/test/render";

import { PlanFormScreen } from "./PlanFormScreen";

const mockRouter = { push: jest.fn(), back: jest.fn(), replace: jest.fn(), canGoBack: jest.fn(() => true) };
let mockParams: Record<string, string> = {};
jest.mock("expo-router", () => ({
  get router() {
    return mockRouter;
  },
  useLocalSearchParams: () => mockParams,
}));
jest.mock("@/lib/format", () => ({ ...jest.requireActual("@/lib/format"), todayLocalIso: () => "2026-10-21" }));

let bff: BffMock;
afterEach(() => bff?.restore());

async function pickDate(field: string, dayLabel: RegExp) {
  await fireEvent.press(screen.getByRole("button", { name: new RegExp(`^${field}:`) }));
  await fireEvent.press(screen.getByRole("button", { name: dayLabel }));
}

describe("PlanFormScreen", () => {
  it("validates, then creates the plan for the student and opens it", async () => {
    mockParams = { clientId: "7" };
    bff = mockBff({
      "POST /api/training-plans": ({ body }) => Response.json({ id: 3, ...(body as object), trainerId: 1 }),
    });
    await renderScreen(<PlanFormScreen />);
    await fireEvent.press(screen.getByRole("button", { name: "Criar plano" }));
    expect(await screen.findByText("Informe o nome do plano")).toBeOnTheScreen();
    expect(screen.getByText("Selecione o nível do plano.")).toBeOnTheScreen();

    await fireEvent.changeText(screen.getByLabelText("Nome do plano"), " Hipertrofia III ");
    await pickDate("Início", /, 26 de out de 2026$/);
    await pickDate("Término", /, 30 de out de 2026$/);
    await fireEvent.press(screen.getByRole("button", { name: "Nível: Selecione" }));
    await fireEvent.press(screen.getByRole("radio", { name: "Avançado" }));
    await fireEvent.press(screen.getByRole("button", { name: "Criar plano" }));
    await waitFor(() => expect(mockRouter.replace).toHaveBeenCalledWith("/planos/3"));
    expect(bff.calls.find((c) => c.route === "POST /api/training-plans")?.body).toEqual({
      name: "Hipertrofia III",
      description: "",
      startDate: "2026-10-26",
      endDate: "2026-10-30",
      level: "ADVANCED",
      clientId: 7,
    });
  });

  it("refuses a past start for a new plan (days before today are disabled)", async () => {
    mockParams = { clientId: "7" };
    bff = mockBff({});
    await renderScreen(<PlanFormScreen />);
    await fireEvent.press(screen.getByRole("button", { name: /^Início:/ }));
    expect(screen.getByRole("button", { name: /, 20 de out de 2026$/ })).toBeDisabled();
    expect(screen.getByRole("button", { name: /, 21 de out de 2026, hoje$/ })).toBeEnabled();
  });

  it("edits an existing plan that already started, keeping its dates", async () => {
    mockParams = { id: "1" };
    bff = mockBff({
      "GET /api/training-plans/1": {
        id: 1, name: "Hipertrofia II", description: "", trainerId: 1, clientId: 7,
        startDate: "2026-03-01", endDate: "2026-11-24", level: "INTERMEDIATE", workouts: [],
      },
      "PATCH /api/training-plans/1": { id: 1 },
    });
    await renderScreen(<PlanFormScreen />);
    await fireEvent.changeText(await screen.findByLabelText("Nome do plano"), "Hipertrofia II+");
    await fireEvent.press(screen.getByRole("button", { name: "Salvar" }));
    await waitFor(() => expect(mockRouter.back).toHaveBeenCalled());
    expect(bff.calls.find((c) => c.route === "PATCH /api/training-plans/1")?.body).toEqual({
      name: "Hipertrofia II+",
      description: "",
      startDate: "2026-03-01",
      endDate: "2026-11-24",
      level: "INTERMEDIATE",
    });
  });

  it("refuses an end on or before the start", async () => {
    mockParams = { clientId: "7" };
    bff = mockBff({});
    await renderScreen(<PlanFormScreen />);
    await fireEvent.changeText(screen.getByLabelText("Nome do plano"), "Base");
    await pickDate("Início", /, 26 de out de 2026$/);
    await fireEvent.press(screen.getByRole("button", { name: /^Término:/ }));
    expect(screen.getByRole("button", { name: /, 26 de out de 2026$/ })).toBeDisabled();
    expect(screen.getByRole("button", { name: /, 27 de out de 2026$/ })).toBeEnabled();
  });

  it("lets an edited plan keep a start date in the past, but not move it earlier", async () => {
    mockParams = { id: "1" };
    bff = mockBff({
      "GET /api/training-plans/1": {
        id: 1, name: "Base", description: "", trainerId: 1, clientId: 7,
        startDate: "2026-10-05", endDate: "2026-11-24", level: "BEGINNER", workouts: [],
      },
    });
    await renderScreen(<PlanFormScreen />);
    await fireEvent.press(await screen.findByRole("button", { name: /^Início:/ }));
    expect(screen.getByRole("button", { name: /, 05 de out de 2026$/ })).toBeEnabled();
    expect(screen.getByRole("button", { name: /, 04 de out de 2026$/ })).toBeDisabled();
  });

  it("creates once however fast the button is tapped", async () => {
    mockParams = { clientId: "7" };
    let answer!: (r: Response) => void;
    bff = mockBff({ "POST /api/training-plans": () => new Promise<Response>((r) => (answer = r)) });
    await renderScreen(<PlanFormScreen />);
    await fireEvent.changeText(screen.getByLabelText("Nome do plano"), "Base");
    await pickDate("Início", /, 26 de out de 2026$/);
    await pickDate("Término", /, 30 de out de 2026$/);
    await fireEvent.press(screen.getByRole("button", { name: "Nível: Selecione" }));
    await fireEvent.press(screen.getByRole("radio", { name: "Iniciante" }));
    const create = screen.getByRole("button", { name: "Criar plano" });
    await fireEvent.press(create);
    await fireEvent.press(create);
    await waitFor(() => expect(bff.calls.filter((c) => c.route === "POST /api/training-plans")).toHaveLength(1));
    answer(Response.json({ id: 9 }));
    await waitFor(() => expect(mockRouter.replace).toHaveBeenCalledWith("/planos/9"));
    expect(bff.calls.filter((c) => c.route === "POST /api/training-plans")).toHaveLength(1);
  });

  it("goes back to the roster when opened without a student", async () => {
    mockParams = {};
    bff = mockBff({});
    await renderScreen(<PlanFormScreen />);
    await waitFor(() => expect(mockRouter.replace).toHaveBeenCalledWith("/alunos"));
  });
});

