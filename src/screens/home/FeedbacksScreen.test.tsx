import { screen } from "@testing-library/react-native";

import { mockBff, type BffMock } from "@/test/bff";
import { renderScreen } from "@/test/render";

import { FeedbacksScreen } from "./FeedbacksScreen";

jest.mock("expo-router", () => ({ router: { back: jest.fn(), canGoBack: () => true } }));

let bff: BffMock;
afterEach(() => bff?.restore());

const item = (id: number, name: string) => ({
  id,
  workoutLogId: id,
  workoutId: 1,
  trainingPlanId: 1,
  clientId: id,
  text: `Comentário ${id}`,
  createdAt: "2026-10-01T10:00:00Z",
  clientName: name,
  workoutName: "Treino A",
  trainingPlanName: "Base",
});

describe("FeedbacksScreen", () => {
  it("lists every feedback, newest first as the BFF sends them", async () => {
    bff = mockBff({ "GET /api/feedback": [item(2, "Rafael Lima"), item(1, "Marina Costa")] });
    await renderScreen(<FeedbacksScreen />);
    expect(await screen.findByText("Mais recentes primeiro")).toBeOnTheScreen();
    const names = screen.getAllByText(/Rafael Lima|Marina Costa/).map((n) => n.props.children);
    expect(names).toEqual(["Rafael Lima", "Marina Costa"]);
  });

  it("explains the empty list", async () => {
    bff = mockBff({ "GET /api/feedback": [] });
    await renderScreen(<FeedbacksScreen />);
    expect(await screen.findByText("Nenhum feedback ainda")).toBeOnTheScreen();
  });
});
