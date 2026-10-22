import { fireEvent, render, screen } from "@testing-library/react-native";
import { Dumbbell } from "lucide-react-native";

import { ActivePlanCard } from "./ActivePlanCard";

describe("ActivePlanCard", () => {
  it("shows the plan, today's workout and runs the main and second actions", async () => {
    const start = jest.fn();
    const discard = jest.fn();
    await render(
      <ActivePlanCard
        name="Hipertrofia II"
        level="INTERMEDIATE"
        meta="01 set – 30 nov · 4 treinos por semana"
        today={{ tone: "warning", icon: Dumbbell, eyebrow: "EM ANDAMENTO", title: "Treino C", detail: "3 de 6 exercícios", progress: 0.5 }}
        action={{ label: "Continuar treino", onPress: start }}
        secondary={{ label: "Descartar treino", onPress: discard }}
      />,
    );
    expect(screen.getByRole("header", { name: "Hipertrofia II" })).toBeOnTheScreen();
    expect(screen.getByText("Intermediário")).toBeOnTheScreen();
    expect(screen.getByLabelText("Progresso do treino")).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole("button", { name: "Continuar treino" }));
    await fireEvent.press(screen.getByRole("button", { name: "Descartar treino" }));
    expect(start).toHaveBeenCalled();
    expect(discard).toHaveBeenCalled();
  });

  it("can disable the main action", async () => {
    await render(
      <ActivePlanCard
        name="P"
        level="BEGINNER"
        meta=""
        today={{ tone: "neutral", icon: Dumbbell, eyebrow: "TREINOS", title: "Nenhum treino", detail: "" }}
        action={{ label: "Começar treino", disabled: true, onPress: () => {} }}
      />,
    );
    expect(screen.getByRole("button", { name: "Começar treino" })).toBeDisabled();
  });
});
