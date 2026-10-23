import type { FullWorkout, TrainingPlan, TrainingPlanDetail, Workout, WorkoutLog } from "@/lib/api/types";

/** A client's data as the BFF answers it, for the client screens' tests. Wednesday 2026-10-21. */
export const TODAY = "2026-10-21";

export const plan: TrainingPlan = {
  id: 1,
  name: "Hipertrofia II",
  description: "Volume progressivo.",
  trainerId: 2,
  clientId: 7,
  startDate: "2026-09-01",
  endDate: "2026-11-30",
  level: "INTERMEDIATE",
};

export const workout = (id: number, dayOfWeek: Workout["dayOfWeek"], name = `Treino ${id}`): Workout => ({
  id,
  name,
  trainingPlanId: 1,
  dayOfWeek,
});

export const planDetail = (workouts: Workout[]): TrainingPlanDetail => ({ ...plan, workouts });

export const full = (w: Workout, exercises = 2, setsEach = 3): FullWorkout => ({
  ...w,
  exercises: Array.from({ length: exercises }, (_, i) => ({
    id: w.id * 100 + i,
    workoutId: w.id,
    exerciseId: i + 1,
    order: i,
    restSecondsBetweenSets: 60,
    notes: "",
    exercise: { id: i + 1, name: `Exercício ${i + 1}`, description: "", videoUrl: "", muscleGroups: [], isStarter: true },
    sets: Array.from({ length: setsEach }, (_, j) => ({
      id: w.id * 1000 + i * 10 + j,
      workoutExerciseId: w.id * 100 + i,
      setNumber: j + 1,
      reps: 12,
      durationSeconds: 0,
      weight: "",
      loadPercentage: "",
      strategy: "STRAIGHT" as const,
      restSeconds: 60,
      notes: "",
    })),
  })),
});

export const log = (workoutId: number, completedAt = "", startedAt = "2026-10-21T10:00:00Z"): WorkoutLog => ({
  id: workoutId * 10,
  workoutId,
  clientId: 7,
  weekStartDate: "2026-10-19",
  startedAt,
  completedAt,
  status: completedAt === "" ? "IN_PROGRESS" : "COMPLETED",
  completionKind: completedAt === "" ? "" : "CLIENT",
});
