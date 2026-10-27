import {
  durationText,
  exerciseSummary,
  nextSetText,
  prescribedLoad,
  restSecondsFor,
  setTarget,
  strategyGuide,
  weightText,
} from "./workoutText";

const set = (over: Partial<Parameters<typeof setTarget>[0] & { weight: string; loadPercentage: string; restSeconds: number }> = {}) => ({
  reps: 12,
  durationSeconds: 0,
  strategy: "STRAIGHT" as const,
  weight: "",
  loadPercentage: "",
  restSeconds: 60,
  ...over,
});

describe("workoutText", () => {
  it("writes weights with a comma", () => {
    expect(weightText("42.5")).toBe("42,5");
    expect(weightText("")).toBe("");
  });

  it("writes durations", () => {
    expect(durationText(45)).toBe("45 s");
    expect(durationText(90)).toBe("90 s");
    expect(durationText(150)).toBe("2:30");
  });

  it("reads a set's target", () => {
    expect(setTarget(set())).toBe("12 reps · Direta");
    expect(setTarget(set({ durationSeconds: 30, reps: 0, strategy: "ISOMETRIC_HOLD" }))).toBe("30 s · Isometria");
    expect(setTarget(set({ reps: 0, strategy: "FAILURE" }))).toBe("Até a falha · Falha");
    expect(setTarget(set({ reps: 0, strategy: "AMRAP" }))).toBe("Máximo de reps · AMRAP");
  });

  it("reads the trainer's load", () => {
    expect(prescribedLoad(set({ weight: "40" }))).toBe("Carga sugerida 40 kg");
    expect(prescribedLoad(set({ loadPercentage: "70" }))).toBe("70% da carga máxima");
    expect(prescribedLoad(set())).toBe("");
  });

  it("takes a set's own rest, else the exercise's", () => {
    expect(restSecondsFor(set({ restSeconds: 90 }), { restSecondsBetweenSets: 60 })).toBe(90);
    expect(restSecondsFor(set({ restSeconds: 0 }), { restSecondsBetweenSets: 45 })).toBe(45);
  });

  it("summarises an exercise", () => {
    const ex = (sets: ReturnType<typeof set>[]) =>
      ({ restSecondsBetweenSets: 60, sets: sets.map((s, i) => ({ ...s, id: i, workoutExerciseId: 1, setNumber: i + 1, notes: "" })) });
    expect(exerciseSummary(ex([set(), set(), set({ reps: 10 }), set({ reps: 8 })]))).toBe("4 séries · 12 a 8 reps · 60 s de descanso");
    expect(exerciseSummary(ex([set({ durationSeconds: 30, reps: 0, restSeconds: 45 })]))).toBe("1 série · 30 s · 45 s de descanso");
    expect(exerciseSummary(ex([]))).toBe("0 séries");
  });
});

describe("strategyGuide", () => {
  it("has nothing to explain for a plain Direta set", () => {
    expect(strategyGuide({ strategy: "STRAIGHT", notes: "", durationSeconds: 0 })).toBeNull();
    expect(strategyGuide({ strategy: "STRAIGHT", notes: "  ", durationSeconds: 0 })).toBeNull();
  });

  it("explains a strategy with its own description", () => {
    expect(strategyGuide({ strategy: "FAILURE", notes: "", durationSeconds: 0 })).toEqual({
      name: "Falha",
      text: "Faça repetições até não conseguir completar mais nenhuma com boa técnica.",
      fromTrainer: false,
    });
  });

  it("names the hold button for Isometria only on a timed set", () => {
    expect(strategyGuide({ strategy: "ISOMETRIC_HOLD", notes: "", durationSeconds: 30 })?.text).toBe(
      "Segure a posição parada pelo tempo indicado. Use o botão ▶ para cronometrar.",
    );
    expect(strategyGuide({ strategy: "ISOMETRIC_HOLD", notes: "", durationSeconds: 0 })?.text).toBe(
      "Segure a posição parada por alguns segundos em cada repetição, sem mover.",
    );
  });

  it("puts the trainer's description in its place, Direta included", () => {
    expect(strategyGuide({ strategy: "DROPSET", notes: " Tire 10 kg. ", durationSeconds: 0 })).toEqual({ name: "Dropset", text: "Tire 10 kg.", fromTrainer: true });
    expect(strategyGuide({ strategy: "STRAIGHT", notes: "Pausa de 1 s embaixo.", durationSeconds: 0 })).toEqual({
      name: "Direta",
      text: "Pausa de 1 s embaixo.",
      fromTrainer: true,
    });
  });
});

describe("nextSetText", () => {
  it("names the next set, its goal and a strategy other than Direta", () => {
    expect(nextSetText({ setNumber: 2, reps: 10, durationSeconds: 0, strategy: "STRAIGHT" })).toBe("Próxima: série 2 · 10 reps");
    expect(nextSetText({ setNumber: 3, reps: 10, durationSeconds: 0, strategy: "DROPSET" })).toBe("Próxima: série 3 · 10 reps · Dropset");
    expect(nextSetText({ setNumber: 1, reps: 0, durationSeconds: 30, strategy: "ISOMETRIC_HOLD" })).toBe("Próxima: série 1 · 30 s · Isometria");
  });
});
