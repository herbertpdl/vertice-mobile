import { keepPreviousData, useInfiniteQuery } from "@tanstack/react-query";
import { useMemo } from "react";

import { exerciseSearch, exercisesQueryKey, fetchExercisesPage } from "@/lib/api/exercises";
import { useDebouncedValue } from "@/lib/useDebouncedValue";

/**
 * The paged exercise search behind the workout-editor picker and the catalog. It stays `idle`
 * (no request at all) until the search has 3 or more letters or a group is chosen, then loads
 * one page at a time: call `fetchNextPage` as the list nears its end. Rows are in server order.
 */
export function useExerciseSearch(search: string, muscleGroupId: number | null, { enabled = true }: { enabled?: boolean } = {}) {
  const debounced = useDebouncedValue(search);
  const filter = exerciseSearch(debounced, muscleGroupId);
  const query = useInfiniteQuery({
    queryKey: exercisesQueryKey(filter),
    queryFn: ({ pageParam, signal }) => fetchExercisesPage({ ...filter, cursor: pageParam }, { signal }),
    initialPageParam: null as string | null,
    getNextPageParam: (last) => last.nextCursor,
    enabled: enabled && filter.enabled,
    placeholderData: keepPreviousData,
  });
  const idle = !filter.enabled;
  // Disabled, the query would still hand back the previous filter's placeholder pages.
  const exercises = useMemo(
    () => (idle ? undefined : query.data?.pages.flatMap((page) => page.exercises)),
    [idle, query.data],
  );
  return { ...query, idle, exercises };
}
