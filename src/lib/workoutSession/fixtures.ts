import type { SetLog, WorkoutSession, WorkoutSessionSet } from "@/lib/api/types";
import { weekStartOf } from "@/lib/calendar";
import { todayLocalIso } from "@/lib/format";

/** A workout session as the BFF answers it, for the session's tests. */
export function setLog(exerciseSetId: number, weight: string): SetLog {
  return { id: exerciseSetId * 10, workoutLogId: 500, exerciseSetId, weight, reps: 10, recordedAt: "2026-10-21T10:00:00Z" };
}

export function set(id: number, setNumber: number, over: Partial<WorkoutSessionSet> = {}): WorkoutSessionSet {
  return {
    id,
    workoutExerciseId: Math.floor(id / 10),
    setNumber,
    reps: 12,
    durationSeconds: 0,
    weight: "",
    loadPercentage: "",
    strategy: "STRAIGHT",
    restSeconds: 60,
    notes: "",
    lastPerformed: null,
    current: null,
    ...over,
  };
}

export function session(exercises: { id: number; order: number; name: string; sets: WorkoutSessionSet[]; rest?: number }[]): WorkoutSession {
  return {
    id: 12,
    name: "Treino B",
    trainingPlanId: 1,
    dayOfWeek: "WEDNESDAY",
    exercises: exercises.map((e) => ({
      id: e.id,
      workoutId: 12,
      exerciseId: e.id,
      order: e.order,
      restSecondsBetweenSets: e.rest ?? 60,
      notes: "",
      exercise: { id: e.id, name: e.name, description: "", videoUrl: "", muscleGroups: [], isStarter: true },
      sets: e.sets,
    })),
    workoutLog: {
      id: 500,
      workoutId: 12,
      clientId: 7,
      // This week, whenever the tests run: a session from an earlier week is never resumed.
      weekStartDate: weekStartOf(todayLocalIso()),
      startedAt: "2026-10-21T10:00:00Z",
      completedAt: "",
      status: "IN_PROGRESS",
      completionKind: "",
    },
  };
}
