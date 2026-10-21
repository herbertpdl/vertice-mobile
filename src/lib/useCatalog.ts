import { useQuery } from "@tanstack/react-query";

import { exerciseQueryKey, fetchExercise } from "@/lib/api/exercises";
import { fetchMuscleGroups, muscleGroupsQueryKey } from "@/lib/api/muscleGroups";

/** The muscle groups (reference data the platform team changes rarely: never stale). */
export function useMuscleGroups({ enabled = true }: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: muscleGroupsQueryKey,
    queryFn: ({ signal }) => fetchMuscleGroups({ signal }),
    staleTime: Infinity,
    enabled,
  });
}

/** One exercise, for its detail screen and edit form. */
export function useExercise(id: number, { enabled = true }: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: exerciseQueryKey(id),
    queryFn: ({ signal }) => fetchExercise(id, { signal }),
    enabled,
  });
}
