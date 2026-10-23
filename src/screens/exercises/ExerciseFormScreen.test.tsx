import { fireEvent, screen, waitFor } from "@testing-library/react-native";

import type { Exercise } from "@/lib/api/types";
import { bffError, mockBff, type BffMock } from "@/test/bff";
import { renderScreen } from "@/test/render";

import { ExerciseFormScreen } from "./ExerciseFormScreen";

const mockRouter = { push: jest.fn(), back: jest.fn(), replace: jest.fn(), canGoBack: jest.fn(() => true) };
let mockParams: Record<string, string> = {};
jest.mock("expo-router", () => ({
  get router() {
    return mockRouter;
  },
  useLocalSearchParams: () => mockParams,
}));

const groups = [{ id: 1, name: "Peito" }, { id: 2, name: "Costas" }];
const own: Exercise = { id: 4, name: "Remada", description: "", videoUrl: "", isStarter: false, muscleGroups: [groups[1]] };

let bff: BffMock;
afterEach(() => bff?.restore());

describe("ExerciseFormScreen", () => {
  it("validates, then creates the exercise and opens it", async () => {
    mockParams = {};
    bff = mockBff({
      "GET /api/muscle-groups": groups,
      "POST /api/exercises": ({ body }) => Response.json({ ...own, id: 12, ...(body as object) }),
    });
    await renderScreen(<ExerciseFormScreen />);
    await fireEvent.press(await screen.findByRole("button", { name: "Criar exercício" }));
    expect(await screen.findByText("Informe o nome do exercício")).toBeOnTheScreen();
    expect(screen.getByText("Selecione pelo menos um grupo muscular")).toBeOnTheScreen();

    await fireEvent.changeText(screen.getByLabelText("Nome do exercício"), " Remada Curvada ");
    await fireEvent.press(screen.getByRole("button", { name: /^Grupos musculares/ }));
    await fireEvent.press(screen.getByRole("checkbox", { name: "Costas" }));
    await fireEvent.press(screen.getByRole("button", { name: "Aplicar (1)" }));
    await fireEvent.changeText(screen.getByLabelText("URL do vídeo (opcional)"), "https://vimeo.com/824512");
    expect(screen.queryByRole("link", { name: "Abrir vídeo" })).toBeNull();
    await fireEvent.press(screen.getByRole("button", { name: "Criar exercício" }));
    expect(await screen.findByText("Só aceitamos vídeos do YouTube (youtube.com ou youtu.be).")).toBeOnTheScreen();
    await fireEvent.changeText(screen.getByLabelText("URL do vídeo (opcional)"), "https://youtu.be/dQw4w9WgXcQ");
    await fireEvent.press(screen.getByRole("link", { name: "Abrir vídeo" }));
    expect(screen.getByTestId("webview")).toBeOnTheScreen();
    await fireEvent.press(screen.getAllByRole("button", { name: "Fechar" }).at(-1)!);
    await fireEvent.press(screen.getByRole("button", { name: "Criar exercício" }));
    await waitFor(() => expect(mockRouter.replace).toHaveBeenCalledWith("/exercicios/12"));
    expect(bff.calls.find((c) => c.route === "POST /api/exercises")?.body).toEqual({
      name: "Remada Curvada",
      muscleGroupIds: [2],
      description: "",
      videoUrl: "https://youtu.be/dQw4w9WgXcQ",
    });
  });

  it("edits the trainer's exercise", async () => {
    mockParams = { id: "4" };
    bff = mockBff({ "GET /api/muscle-groups": groups, "GET /api/exercises/4": own, "PATCH /api/exercises/4": own });
    await renderScreen(<ExerciseFormScreen />);
    await fireEvent.changeText(await screen.findByLabelText("Descrição"), "Coluna neutra.");
    await fireEvent.press(screen.getByRole("button", { name: "Salvar alterações" }));
    await waitFor(() => expect(mockRouter.back).toHaveBeenCalled());
    expect(bff.calls.find((c) => c.route === "PATCH /api/exercises/4")?.body).toMatchObject({ description: "Coluna neutra.", muscleGroupIds: [2] });
  });

  it("shows fixed copy when the save is refused", async () => {
    mockParams = { id: "4" };
    bff = mockBff({ "GET /api/muscle-groups": groups, "GET /api/exercises/4": own, "PATCH /api/exercises/4": bffError(403, "FORBIDDEN") });
    await renderScreen(<ExerciseFormScreen />);
    await fireEvent.press(await screen.findByRole("button", { name: "Salvar alterações" }));
    expect(await screen.findByText("Você não tem permissão para alterar este exercício.")).toBeOnTheScreen();
  });

  it("sends a starter exercise's edit route back", async () => {
    mockParams = { id: "1" };
    bff = mockBff({ "GET /api/muscle-groups": groups, "GET /api/exercises/1": { ...own, id: 1, isStarter: true } });
    await renderScreen(<ExerciseFormScreen />);
    await waitFor(() => expect(mockRouter.back).toHaveBeenCalled());
  });

  it("leaves an edit route whose id can't exist, without fetching it", async () => {
    mockParams = { id: "abc" };
    bff = mockBff({ "GET /api/muscle-groups": groups });
    await renderScreen(<ExerciseFormScreen />);
    await waitFor(() => expect(mockRouter.back).toHaveBeenCalled());
    expect(bff.calls.some((c) => c.route.startsWith("GET /api/exercises/"))).toBe(false);
  });
});
