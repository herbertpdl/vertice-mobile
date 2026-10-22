import { fireEvent, screen } from "@testing-library/react-native";

import { mockBff, type BffMock } from "@/test/bff";
import { renderScreen } from "@/test/render";

import { ClientPlansScreen, groupPlans } from "./ClientPlansScreen";
import { plan } from "./fixtures";

const mockPush = jest.fn();
jest.mock("expo-router", () => ({ router: { push: (...args: unknown[]) => mockPush(...args) } }));
jest.mock("@/lib/format", () => ({ ...jest.requireActual("@/lib/format"), todayLocalIso: () => "2026-10-21" }));

const plans = [
  { ...plan, id: 1, name: "Atual" },
  { ...plan, id: 2, name: "Antigo", startDate: "2026-03-01", endDate: "2026-05-31" },
  { ...plan, id: 3, name: "Próximo", startDate: "2026-12-01", endDate: "2027-02-28" },
  { ...plan, id: 4, name: "Mais antigo", startDate: "2026-01-01", endDate: "2026-02-28" },
];

let bff: BffMock;
afterEach(() => bff?.restore());

describe("groupPlans", () => {
  it("groups active, upcoming and ended, ended newest first", () => {
    expect(groupPlans(plans, "2026-10-21").map((g) => [g.title, g.plans.map((p) => p.name)])).toEqual([
      ["EM ANDAMENTO", ["Atual"]],
      ["PRÓXIMOS", ["Próximo"]],
      ["ENCERRADOS", ["Antigo", "Mais antigo"]],
    ]);
  });

  it("leaves out empty groups", () => {
    expect(groupPlans([plans[0]], "2026-10-21").map((g) => g.title)).toEqual(["EM ANDAMENTO"]);
  });
});

describe("ClientPlansScreen", () => {
  it("lists the plans by group and opens one", async () => {
    bff = mockBff({ "GET /api/training-plans": plans });
    await renderScreen(<ClientPlansScreen />);
    expect(await screen.findByRole("header", { name: "ENCERRADOS" })).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole("button", { name: /^Próximo,/ }));
    expect(mockPush).toHaveBeenCalledWith("/aluno/planos/3");
  });

  it("says when there are no plans yet", async () => {
    bff = mockBff({ "GET /api/training-plans": [] });
    await renderScreen(<ClientPlansScreen />);
    expect(await screen.findByText("Nenhum plano ainda")).toBeOnTheScreen();
  });
});
