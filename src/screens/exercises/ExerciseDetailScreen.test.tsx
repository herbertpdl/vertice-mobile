import { fireEvent, screen, waitFor } from "@testing-library/react-native";
import { Platform } from "react-native";

import type { Exercise } from "@/lib/api/types";
import { bffError, mockBff, type BffMock, type BffRoutes } from "@/test/bff";
import { renderScreen } from "@/test/render";

import { ExerciseDetailScreen } from "./ExerciseDetailScreen";

const mockRouter = { push: jest.fn(), back: jest.fn(), replace: jest.fn(), canGoBack: jest.fn(() => true) };
let mockParams: Record<string, string> = {};
jest.mock("expo-router", () => ({
  get router() {
    return mockRouter;
  },
  useLocalSearchParams: () => mockParams,
}));
jest.mock("expo-web-browser", () => ({ openBrowserAsync: jest.fn() }));

const own: Exercise = {
  id: 4,
  name: "Remada Curvada",
  description: "Coluna neutra.",
  videoUrl: "https://youtu.be/dQw4w9WgXcQ",
  isStarter: false,
  muscleGroups: [{ id: 2, name: "Costas" }],
};
const starter: Exercise = { ...own, id: 1, name: "Agachamento Livre", isStarter: true, videoUrl: "" };

let bff: BffMock;
beforeEach(() => jest.replaceProperty(Platform, "OS", "android"));
afterEach(() => bff?.restore());

async function open(exercise: Exercise, routes: BffRoutes = {}) {
  mockParams = { id: String(exercise.id) };
  bff = mockBff({ [`GET /api/exercises/${exercise.id}`]: exercise, ...routes });
  await renderScreen(<ExerciseDetailScreen />);
  await screen.findByText(exercise.name);
}

describe("ExerciseDetailScreen", () => {
  it("shows the trainer's own exercise with its video, and edits it", async () => {
    await open(own);
    expect(screen.getByText("Coluna neutra.")).toBeOnTheScreen();
    expect(screen.getByRole("link", { name: "Abrir vídeo" })).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole("button", { name: "Editar exercício" }));
    expect(mockRouter.push).toHaveBeenCalledWith("/exercicios/4/editar");
  });

  it("is read-only for a starter exercise", async () => {
    await open(starter);
    expect(screen.getByText("Exercício padrão — não pode ser editado.")).toBeOnTheScreen();
    expect(screen.queryByRole("button", { name: "Ações do exercício" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Editar exercício" })).toBeNull();
    expect(screen.queryByRole("link", { name: "Abrir vídeo" })).toBeNull();
  });

  it("says why an exercise a workout uses can't be deleted", async () => {
    await open(own, { "DELETE /api/exercises/4": bffError(409, "PRECONDITION_FAILED") });
    await fireEvent.press(screen.getByRole("button", { name: "Ações do exercício" }));
    await fireEvent.press(screen.getByRole("button", { name: "Excluir exercício" }));
    expect(screen.getByText("“Remada Curvada” será removido do seu catálogo.")).toBeOnTheScreen();
    await fireEvent.press(screen.getAllByRole("button", { name: "Excluir exercício" }).at(-1)!);
    expect(await screen.findByText("Um treino usa este exercício. Remova-o dos treinos antes de excluí-lo.")).toBeOnTheScreen();
    expect(mockRouter.back).not.toHaveBeenCalled();
  });

  it("deletes and goes back", async () => {
    await open(own, { "DELETE /api/exercises/4": new Response(null, { status: 204 }) });
    await fireEvent.press(screen.getByRole("button", { name: "Ações do exercício" }));
    await fireEvent.press(screen.getByRole("button", { name: "Excluir exercício" }));
    await fireEvent.press(screen.getAllByRole("button", { name: "Excluir exercício" }).at(-1)!);
    await waitFor(() => expect(mockRouter.back).toHaveBeenCalled());
    expect(screen.getByText("Exercício excluído.")).toBeOnTheScreen();
  });

  it("leaves an exercise that isn't there", async () => {
    mockParams = { id: "9" };
    bff = mockBff({ "GET /api/exercises/9": bffError(404, "NOT_FOUND") });
    await renderScreen(<ExerciseDetailScreen />);
    await waitFor(() => expect(mockRouter.back).toHaveBeenCalled());
  });
});
