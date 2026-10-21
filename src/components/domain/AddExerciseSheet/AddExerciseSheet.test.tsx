import { fireEvent, screen } from "@testing-library/react-native";

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

let bff: BffMock;
afterEach(() => bff?.restore());

describe("AddExerciseSheet", () => {
  it("adds several picked exercises in the order they were picked", async () => {
    bff = mockBff({
      "GET /api/exercises": ({ url }) =>
        Response.json(url.searchParams.get("muscleGroupId") === "2" ? [catalog[2]] : catalog),
      "GET /api/muscle-groups": [{ id: 1, name: "Peito" }, { id: 2, name: "Costas" }],
    });
    const onAdd = jest.fn();
    await renderScreen(<AddExerciseSheet visible onClose={() => {}} onAdd={onAdd} remaining={20} />);
    expect(screen.getByRole("button", { name: "Adicionar" })).toBeDisabled();
    await fireEvent.press(await screen.findByRole("checkbox", { name: "Crucifixo" }));
    await fireEvent.press(screen.getByRole("button", { name: "Costas" }));
    await fireEvent.press(await screen.findByRole("checkbox", { name: "Puxada Alta" }));
    await fireEvent.press(screen.getByRole("button", { name: "Adicionar 2" }));
    expect(onAdd).toHaveBeenCalledWith([catalog[1], catalog[2]]);
  });

  it("stops picking at what the workout still takes", async () => {
    bff = mockBff({ "GET /api/exercises": catalog, "GET /api/muscle-groups": [] });
    await renderScreen(<AddExerciseSheet visible onClose={() => {}} onAdd={() => {}} remaining={1} />);
    await fireEvent.press(await screen.findByRole("checkbox", { name: "Supino Reto" }));
    expect(screen.getByRole("checkbox", { name: "Crucifixo" })).toBeDisabled();
    expect(screen.getByText("O treino pode ter até 20 exercícios.")).toBeOnTheScreen();
  });

  it("says when nothing matches", async () => {
    bff = mockBff({ "GET /api/exercises": [], "GET /api/muscle-groups": [] });
    await renderScreen(<AddExerciseSheet visible onClose={() => {}} onAdd={() => {}} remaining={20} />);
    expect(await screen.findByText("Nenhum exercício encontrado.")).toBeOnTheScreen();
  });
});
