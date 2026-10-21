import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";

import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import { ErrorState } from "@/components/ui/EmptyState";
import { SearchField } from "@/components/ui/SearchField";
import { Sheet } from "@/components/ui/Sheet";
import { Spinner } from "@/components/ui/Spinner";
import { Text } from "@/components/ui/Text";
import { exercisesQueryKey, fetchExercises } from "@/lib/api/exercises";
import { fetchMuscleGroups, muscleGroupsQueryKey } from "@/lib/api/muscleGroups";
import type { Exercise } from "@/lib/api/types";
import { useDebouncedValue } from "@/lib/useDebouncedValue";
import { MAX_EXERCISES } from "@/lib/workoutEditor/model";
import { space } from "@/theme";

import { ExerciseCard } from "../ExerciseCard";

export type AddExerciseSheetProps = {
  visible: boolean;
  onClose: () => void;
  /** The picked exercises, in the order they were picked. */
  onAdd: (exercises: Exercise[]) => void;
  /** How many more exercises the workout takes (20 minus what it has). */
  remaining: number;
};

/**
 * M - Adicionar Exercício (Sheet): search, muscle-group chips, the catalog as M Exercise Pick
 * Cards (several at once), "Adicionar N". Picking stops at what the workout still takes — the
 * 20-exercise cap. Remount it (a new `key`) per opening, so every opening starts empty.
 */
export function AddExerciseSheet({ visible, onClose, onAdd, remaining }: AddExerciseSheetProps) {
  const [search, setSearch] = useState("");
  const [muscleGroupId, setMuscleGroupId] = useState<number | null>(null);
  const [picked, setPicked] = useState<Exercise[]>([]);
  const q = useDebouncedValue(search);

  const list = useQuery({
    queryKey: exercisesQueryKey({ muscleGroupId, q }),
    queryFn: ({ signal }) => fetchExercises({ muscleGroupId, q }, { signal }),
    placeholderData: keepPreviousData,
    enabled: visible,
  });
  const groups = useQuery({
    queryKey: muscleGroupsQueryKey,
    queryFn: ({ signal }) => fetchMuscleGroups({ signal }),
    staleTime: Infinity,
    enabled: visible,
  });

  const full = picked.length >= remaining;
  const toggle = (exercise: Exercise) =>
    setPicked((current) =>
      current.some((e) => e.id === exercise.id) ? current.filter((e) => e.id !== exercise.id) : [...current, exercise],
    );

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title="Adicionar exercício"
      footer={
        <Button
          label={picked.length === 0 ? "Adicionar" : `Adicionar ${picked.length}`}
          disabled={picked.length === 0}
          style={styles.flex}
          onPress={() => onAdd(picked)}
        />
      }
    >
      <SearchField value={search} onChangeText={setSearch} placeholder="Buscar exercício" accessibilityLabel="Buscar exercício" />
      {groups.data === undefined || groups.data.length === 0 ? null : (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips} keyboardShouldPersistTaps="handled">
          <Chip label="Todos" selected={muscleGroupId === null} onPress={() => setMuscleGroupId(null)} />
          {groups.data.map((group) => (
            <Chip key={group.id} label={group.name} selected={muscleGroupId === group.id} onPress={() => setMuscleGroupId(group.id)} />
          ))}
        </ScrollView>
      )}
      {remaining <= 0 ? (
        <Text variant="caption" color="textSecondary">
          Este treino já tem {MAX_EXERCISES} exercícios — o máximo permitido.
        </Text>
      ) : full ? (
        <Text variant="caption" color="textSecondary">
          O treino pode ter até {MAX_EXERCISES} exercícios.
        </Text>
      ) : null}
      {list.data === undefined ? (
        list.isError ? (
          <ErrorState onRetry={() => void list.refetch()} retrying={list.isFetching} />
        ) : (
          <View style={styles.loading}>
            <Spinner accessibilityLabel="Carregando exercícios" />
          </View>
        )
      ) : list.data.length === 0 ? (
        <Text variant="body" color="textSecondary" align="center" style={styles.empty}>
          Nenhum exercício encontrado.
        </Text>
      ) : (
        <View style={styles.list}>
          {list.data.map((exercise) => {
            const selected = picked.some((e) => e.id === exercise.id);
            return (
              <ExerciseCard
                key={exercise.id}
                exercise={exercise}
                selected={selected}
                disabled={!selected && full}
                onPress={() => toggle(exercise)}
              />
            );
          })}
        </View>
      )}
    </Sheet>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  chips: { gap: space[2] },
  list: { gap: space[3] },
  loading: { paddingVertical: space[8], alignItems: "center" },
  empty: { paddingVertical: space[8] },
});
