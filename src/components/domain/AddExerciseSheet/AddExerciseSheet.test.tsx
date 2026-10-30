import { act, fireEvent, screen } from "@testing-library/react-native";

import type { Exercise } from "@/lib/api/types";
import { mockBff, type BffMock } from "@/test/bff";
import { renderScreen } from "@/test/render";

import { AddExerciseSheet } from "./AddExerciseSheet";

const exercise = (id: number, name: string, group = "Peito"): Exercise => ({
  id,
  name,
  description: "",
  videoUrl: "",
  isStarter: false,
  muscleGroups: [{ id: id * 10, name: group }],
});
const catalog = [exercise(1, "Supino Reto"), exercise(2, "Crucifixo"), exercise(3, "Puxada Alta", "Costas")];

const groups = [{ id: 1, name: "Peito" }, { id: 2, name: "Costas" }];
const page = (exercises: Exercise[], nextCursor: string | null = null) => Response.json({ exercises, nextCursor });
const hint = "Digite ao menos 3 letras ou escolha um grupo muscular.";
const pause = () => act(() => new Promise((resolve) => setTimeout(resolve, 400)));

let bff: BffMock;
afterEach(() => bff?.restore());

describe("AddExerciseSheet", () => {
  it("adds several picked exercises in the order they were picked", async () => {
    bff = mockBff({
      "GET /api/exercises": ({ url }) => page(url.searchParams.get("muscleGroupId") === "2" ? [catalog[2]] : catalog.slice(0, 2)),
      "GET /api/muscle-groups": groups,
    });
    const onAdd = jest.fn();
    await renderScreen(<AddExerciseSheet visible onClose={() => {}} onAdd={onAdd} remaining={20} />);
    expect(screen.getByRole("button", { name: "Adicionar" })).toBeDisabled();
    await fireEvent.press(await screen.findByRole("button", { name: "Peito" }));
    await fireEvent.press(await screen.findByRole("checkbox", { name: "Crucifixo" }));
    await fireEvent.press(screen.getByRole("button", { name: "Costas" }));
    await fireEvent.press(await screen.findByRole("checkbox", { name: "Puxada Alta" }));
    await fireEvent.press(screen.getByRole("button", { name: "Adicionar 2" }));
    expect(onAdd).toHaveBeenCalledWith([catalog[1], catalog[2]]);
  });

  it("loads nothing until 3 letters or a group, and never sends 1-2 letters", async () => {
    const queries: string[] = [];
    bff = mockBff({
      "GET /api/exercises": ({ url }) => {
        queries.push(url.search);
        return page([catalog[0]]);
      },
      "GET /api/muscle-groups": groups,
    });
    await renderScreen(<AddExerciseSheet visible onClose={() => {}} onAdd={() => {}} remaining={20} />);
    expect(await screen.findByText(hint)).toBeOnTheScreen();
    await fireEvent.changeText(screen.getByLabelText("Buscar exercício"), "su");
    await pause();
    expect(queries).toEqual([]);
    await fireEvent.changeText(screen.getByLabelText("Buscar exercício"), "sup");
    expect(await screen.findByRole("checkbox", { name: "Supino Reto" })).toBeOnTheScreen();
    expect(queries).toEqual(["?q=sup"]);
    await fireEvent.changeText(screen.getByLabelText("Buscar exercício"), "");
    await pause();
    await fireEvent.press(screen.getByRole("button", { name: "Costas" }));
    await screen.findByRole("checkbox", { name: "Supino Reto" });
    await fireEvent.press(screen.getByRole("button", { name: "Todos" }));
    expect(await screen.findByText(hint)).toBeOnTheScreen();
    expect(queries).toEqual(["?q=sup", "?muscleGroupId=2"]);
  });

  it("loads the next page on 'Carregar mais'", async () => {
    bff = mockBff({
      "GET /api/exercises": ({ url }) =>
        url.searchParams.get("cursor") === "30" ? page([catalog[2]]) : page(catalog.slice(0, 2), "30"),
      "GET /api/muscle-groups": groups,
    });
    await renderScreen(<AddExerciseSheet visible onClose={() => {}} onAdd={() => {}} remaining={20} />);
    await fireEvent.press(await screen.findByRole("button", { name: "Peito" }));
    await screen.findByRole("checkbox", { name: "Crucifixo" });
    expect(screen.queryByRole("checkbox", { name: "Puxada Alta" })).toBeNull();
    await fireEvent.press(screen.getByRole("button", { name: "Carregar mais" }));
    expect(await screen.findByRole("checkbox", { name: "Puxada Alta" })).toBeOnTheScreen();
    expect(screen.queryByRole("button", { name: "Carregar mais" })).toBeNull();
  });

  it("stops picking at what the workout still takes", async () => {
    bff = mockBff({ "GET /api/exercises": page(catalog), "GET /api/muscle-groups": groups });
    await renderScreen(<AddExerciseSheet visible onClose={() => {}} onAdd={() => {}} remaining={1} />);
    await fireEvent.press(await screen.findByRole("button", { name: "Peito" }));
    await fireEvent.press(await screen.findByRole("checkbox", { name: "Supino Reto" }));
    expect(screen.getByRole("checkbox", { name: "Crucifixo" })).toBeDisabled();
    expect(screen.getByText("O treino pode ter até 20 exercícios.")).toBeOnTheScreen();
  });

  it("says when nothing matches", async () => {
    bff = mockBff({ "GET /api/exercises": page([]), "GET /api/muscle-groups": [] });
    await renderScreen(<AddExerciseSheet visible onClose={() => {}} onAdd={() => {}} remaining={20} />);
    await fireEvent.changeText(screen.getByLabelText("Buscar exercício"), "zzz");
    expect(await screen.findByText("Nenhum exercício encontrado.")).toBeOnTheScreen();
  });
});
