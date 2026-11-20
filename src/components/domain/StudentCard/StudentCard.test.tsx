import { render, screen } from "@testing-library/react-native";
import { StyleSheet } from "react-native";

import { colors } from "@/theme";

import { StudentCard } from "./StudentCard";

const base = {
  id: 1,
  name: "Diego Martins",
  activePlanCount: 0,
  currentPlan: null,
  lastWorkoutAt: null,
  suspended: false,
  weekActivity: [{ date: "2026-10-19", dayOfWeek: "MONDAY" as const, completed: true }],
};

describe("StudentCard", () => {
  it("flags a student without a plan and without a workout this week", async () => {
    await render(<StudentCard student={base} onPress={() => {}} />);
    expect(
      screen.getByRole("button", {
        name: "Diego Martins, Sem plano ativo, último treino: Sem treino nesta semana. Esta semana: Segunda concluído",
      }),
    ).toBeOnTheScreen();
    expect(StyleSheet.flatten(screen.getByText("Sem plano ativo", { includeHiddenElements: true }).props.style).color).toBe(colors.warning);
  });

  it("shows the plan and the last workout in São Paulo time", async () => {
    await render(
      <StudentCard
        student={{ ...base, currentPlan: { id: 2, name: "Base", endDate: "2026-12-01" }, lastWorkoutAt: "2020-01-06T10:40:00Z" }}
        onPress={() => {}}
      />,
    );
    expect(screen.getByRole("button", { name: /^Diego Martins, Base, último treino: 06 jan, 07:40\. Esta semana/ })).toBeOnTheScreen();
  });

  it("shows no badge for an active client", async () => {
    await render(<StudentCard student={base} onPress={() => {}} />);
    expect(screen.queryByText("Suspenso", { includeHiddenElements: true })).toBeNull();
  });

  it("badges a suspended client and says so to screen readers (admin-panel R46, E22)", async () => {
    await render(<StudentCard student={{ ...base, suspended: true }} onPress={() => {}} />);
    expect(
      screen.getByRole("button", {
        name: "Diego Martins, Suspenso, Sem plano ativo, último treino: Sem treino nesta semana. Esta semana: Segunda concluído",
      }),
    ).toBeOnTheScreen();
    const badge = screen.getByText("Suspenso", { includeHiddenElements: true });
    expect(StyleSheet.flatten(badge.props.style).color).toBe(colors.danger);
    // The name still truncates to one line beside it.
    expect(screen.getByText("Diego Martins", { includeHiddenElements: true }).props.numberOfLines).toBe(1);
  });
});
