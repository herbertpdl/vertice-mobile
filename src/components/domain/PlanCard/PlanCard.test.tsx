import { render, screen } from "@testing-library/react-native";

import { PlanCard } from "./PlanCard";

describe("PlanCard", () => {
  it("reads name, period, level and the status from the dates", async () => {
    await render(
      <PlanCard plan={{ name: "Base de força", startDate: "2025-10-07", endDate: "2025-12-20", level: "BEGINNER" }} onPress={() => {}} />,
    );
    expect(screen.getByRole("button", { name: "Base de força, 07 out – 20 dez 2025 · Iniciante, Encerrado" })).toBeOnTheScreen();
  });
});
