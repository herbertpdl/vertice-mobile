import { fireEvent, screen } from "@testing-library/react-native";

import type { Exercise } from "@/lib/api/types";
import { bffError, mockBff, type BffMock } from "@/test/bff";
import { renderScreen } from "@/test/render";

import { catalogSubtitle, ExercisesScreen } from "./ExercisesScreen";

const mockRouter = { push: jest.fn(), back: jest.fn(), replace: jest.fn(), canGoBack: jest.fn(() => true) };
jest.mock("expo-router", () => ({
  get router() {
    return mockRouter;
  },
}));

const exercise = (id: number, name: string, isStarter: boolean, group = { id: 1, name: "Peito" }): Exercise => ({
  id,
  name,
  description: "",
  videoUrl: "",
  isStarter,
  muscleGroups: [group],
});
const catalog = [
  exercise(1, "Supino Reto", true),
  exercise(2, "Puxada Alta", true, { id: 2, name: "Costas" }),
  exercise(3, "Rosca Alternada", false, { id: 3, name: "Bíceps" }),
];

let bff: BffMock;
afterEach(() => bff?.restore());

describe("catalogSubtitle", () => {
  it("counts the catalog and its starters, or the matches", () => {
    expect(catalogSubtitle(catalog, false)).toBe("3 exercícios · 2 padrão");
    expect(catalogSubtitle([catalog[0]], true)).toBe("1 exercício encontrado");
  });
});

describe("ExercisesScreen", () => {
  it("lists the catalog, filters it by muscle group and opens an exercise", async () => {
    bff = mockBff({
      "GET /api/exercises": ({ url }) => Response.json(url.searchParams.get("muscleGroupId") === "2" ? [catalog[1]] : catalog),
      "GET /api/muscle-groups": [{ id: 1, name: "Peito" }, { id: 2, name: "Costas" }],
    });
    await renderScreen(<ExercisesScreen />);
    expect(await screen.findByText("3 exercícios · 2 padrão")).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole("button", { name: "Costas" }));
    expect(await screen.findByText("1 exercício encontrado")).toBeOnTheScreen();
    expect(screen.queryByRole("button", { name: "Supino Reto" })).toBeNull();
    await fireEvent.press(screen.getByRole("button", { name: "Puxada Alta" }));
    expect(mockRouter.push).toHaveBeenCalledWith("/exercicios/2");
    await fireEvent.press(screen.getByRole("button", { name: "Novo exercício" }));
    expect(mockRouter.push).toHaveBeenCalledWith("/exercicios/novo");
  });

  it("searches on the server and offers to clear an empty result", async () => {
    bff = mockBff({
      "GET /api/exercises": ({ url }) => Response.json(url.searchParams.get("q") === "zzz" ? [] : catalog),
      "GET /api/muscle-groups": [],
    });
    await renderScreen(<ExercisesScreen />);
    await screen.findByText("3 exercícios · 2 padrão");
    await fireEvent.changeText(screen.getByPlaceholderText("Buscar exercício"), "zzz");
    expect(await screen.findByText("Nenhum exercício encontrado")).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole("button", { name: "Limpar busca" }));
    expect(await screen.findByText("3 exercícios · 2 padrão")).toBeOnTheScreen();
  });

  it("shows the error state when the first load fails", async () => {
    bff = mockBff({ "GET /api/exercises": bffError(503, "UPSTREAM_UNAVAILABLE"), "GET /api/muscle-groups": [] });
    await renderScreen(<ExercisesScreen />);
    expect(await screen.findByRole("button", { name: /Tentar novamente/ })).toBeOnTheScreen();
  });
});
