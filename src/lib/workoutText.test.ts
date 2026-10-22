import { durationText, exerciseSummary, prescribedLoad, restSecondsFor, setTarget, weightText } from "./workoutText";

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
