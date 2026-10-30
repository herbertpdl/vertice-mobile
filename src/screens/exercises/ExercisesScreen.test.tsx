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

const groups = [{ id: 1, name: "Peito" }, { id: 2, name: "Costas" }];
const page = (exercises: Exercise[], nextCursor: string | null = null) => Response.json({ exercises, nextCursor });

describe("catalogSubtitle", () => {
  it("counts the matches, as a lower bound while more pages remain", () => {
    expect(catalogSubtitle(3, false)).toBe("3 exercícios encontrados");
    expect(catalogSubtitle(1, false)).toBe("1 exercício encontrado");
    expect(catalogSubtitle(30, true)).toBe("Mais de 30 exercícios encontrados");
  });
});

describe("ExercisesScreen", () => {
  it("asks for a search first, lists a muscle group and opens an exercise", async () => {
    bff = mockBff({
      "GET /api/exercises": ({ url }) => page(url.searchParams.get("muscleGroupId") === "2" ? [catalog[1]] : catalog),
      "GET /api/muscle-groups": groups,
    });
    await renderScreen(<ExercisesScreen />);
    expect(await screen.findByText("Busque um exercício")).toBeOnTheScreen();
    expect(bff.calls.some((c) => c.route === "GET /api/exercises")).toBe(false);
    await fireEvent.press(await screen.findByRole("button", { name: "Costas" }));
    expect(await screen.findByText("1 exercício encontrado")).toBeOnTheScreen();
    expect(screen.queryByRole("button", { name: "Supino Reto" })).toBeNull();
    await fireEvent.press(screen.getByRole("button", { name: "Puxada Alta" }));
    expect(mockRouter.push).toHaveBeenCalledWith("/exercicios/2");
    await fireEvent.press(screen.getByRole("button", { name: "Todos" }));
    expect(await screen.findByText("Busque um exercício")).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole("button", { name: "Novo exercício" }));
    expect(mockRouter.push).toHaveBeenCalledWith("/exercicios/novo");
  });

  it("searches on the server from 3 letters and offers to clear an empty result", async () => {
    bff = mockBff({
      "GET /api/exercises": ({ url }) => page(url.searchParams.get("q") === "zzz" ? [] : catalog),
      "GET /api/muscle-groups": [],
    });
    await renderScreen(<ExercisesScreen />);
    await fireEvent.changeText(screen.getByPlaceholderText("Buscar exercício"), "zzz");
    expect(await screen.findByText("Nenhum exercício encontrado")).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole("button", { name: "Limpar busca" }));
    expect(await screen.findByText("Busque um exercício")).toBeOnTheScreen();
  });

  it("loads the next page when the list reaches its end", async () => {
    bff = mockBff({
      "GET /api/exercises": ({ url }) => (url.searchParams.get("cursor") === "30" ? page([catalog[2]]) : page(catalog.slice(0, 2), "30")),
      "GET /api/muscle-groups": groups,
    });
    await renderScreen(<ExercisesScreen />);
    await fireEvent.press(await screen.findByRole("button", { name: "Peito" }));
    expect(await screen.findByText("Mais de 2 exercícios encontrados")).toBeOnTheScreen();
    await fireEvent(screen.getByTestId("exercise-list"), "onEndReached");
    expect(await screen.findByText("3 exercícios encontrados")).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "Rosca Alternada" })).toBeOnTheScreen();
  });

  it("shows the error state when the first load fails", async () => {
    bff = mockBff({ "GET /api/exercises": bffError(503, "UPSTREAM_UNAVAILABLE"), "GET /api/muscle-groups": [] });
    await renderScreen(<ExercisesScreen />);
    await fireEvent.changeText(screen.getByPlaceholderText("Buscar exercício"), "sup");
    expect(await screen.findByRole("button", { name: /Tentar novamente/ })).toBeOnTheScreen();
  });
});
