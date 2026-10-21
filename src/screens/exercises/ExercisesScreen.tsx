import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import { Dumbbell, Plus, SearchX } from "lucide-react-native";
import { useState } from "react";
import { FlatList, RefreshControl, ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ExerciseCard } from "@/components/domain";
import { Screen, tabScreenBottomPadding } from "@/components/layout";
import { Chip, EmptyState, ErrorState, IconButton, SearchField, Skeleton, StatusBanner, Text } from "@/components/ui";
import { exercisesQueryKey, fetchExercises } from "@/lib/api/exercises";
import type { Exercise } from "@/lib/api/types";
import { useIsOffline } from "@/lib/network";
import { useMuscleGroups } from "@/lib/useCatalog";
import { useDebouncedValue } from "@/lib/useDebouncedValue";
import { usePullToRefresh } from "@/lib/usePullToRefresh";
import { colors, radius, screenPaddingHorizontal, sizes, space } from "@/theme";

/** "48 exercícios · 32 padrão", or the match count while a search or group narrows the list. */
export function catalogSubtitle(exercises: Exercise[], narrowed: boolean): string {
  const count = exercises.length;
  if (narrowed) return count === 1 ? "1 exercício encontrado" : `${count} exercícios encontrados`;
  const starters = exercises.filter((e) => e.isStarter).length;
  return `${count === 1 ? "1 exercício" : `${count} exercícios`} · ${starters} padrão`;
}

/** M - Catálogo de Exercícios (+ Loading): search, muscle-group chips, the catalog, "Novo exercício". */
export function ExercisesScreen() {
  const insets = useSafeAreaInsets();
  const offline = useIsOffline();
  const [search, setSearch] = useState("");
  const [muscleGroupId, setMuscleGroupId] = useState<number | null>(null);
  const q = useDebouncedValue(search);
  const list = useQuery({
    queryKey: exercisesQueryKey({ muscleGroupId, q }),
    queryFn: ({ signal }) => fetchExercises({ muscleGroupId, q }, { signal }),
    placeholderData: keepPreviousData,
  });
  const groups = useMuscleGroups();
  const pull = usePullToRefresh(() => Promise.all([list.refetch(), groups.refetch()]));
  const retry = {
    label: "Tentar",
    onPress: () => {
      void list.refetch();
      void groups.refetch();
    },
  };
  const narrowed = q.trim() !== "" || muscleGroupId !== null;
  const clear = () => {
    setSearch("");
    setMuscleGroupId(null);
  };

  const header = (
    <View style={styles.header}>
      <View style={styles.head}>
        <View style={styles.titleCol}>
          <Text variant="title" accessibilityRole="header">
            Exercícios
          </Text>
          {list.isError && list.data === undefined ? null : list.data === undefined ? (
            <Skeleton.Line width={sizes.skeletonSectionWidth} />
          ) : (
            <Text variant="body" color="textSecondary">
              {catalogSubtitle(list.data, narrowed)}
            </Text>
          )}
        </View>
        <IconButton icon={Plus} accessibilityLabel="Novo exercício" onPress={() => router.push("/exercicios/novo")} />
      </View>
      <SearchField value={search} onChangeText={setSearch} placeholder="Buscar exercício" />
      {groups.isError && groups.data === undefined ? (
        <Text variant="caption" color="textSecondary">
          Grupos indisponíveis.
        </Text>
      ) : groups.data === undefined || groups.data.length === 0 ? null : (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips} keyboardShouldPersistTaps="handled">
          <Chip label="Todos" selected={muscleGroupId === null} onPress={() => setMuscleGroupId(null)} />
          {groups.data.map((group) => (
            <Chip key={group.id} label={group.name} selected={muscleGroupId === group.id} onPress={() => setMuscleGroupId(group.id)} />
          ))}
        </ScrollView>
      )}
    </View>
  );

  return (
    <Screen
      scroll={false}
      header={
        offline ? (
          <StatusBanner kind="offline" action={retry} />
        ) : list.isError && list.data !== undefined ? (
          <StatusBanner kind="error" action={retry} />
        ) : undefined
      }
    >
      {list.isError && list.data === undefined ? (
        <View style={styles.padded}>
          {header}
          <ErrorState onRetry={retry.onPress} retrying={list.isFetching} />
        </View>
      ) : (
        <FlatList<Exercise>
          data={list.data ?? []}
          keyExtractor={(exercise) => String(exercise.id)}
          renderItem={({ item }) => <ExerciseCard exercise={item} onPress={() => router.push(`/exercicios/${item.id}`)} />}
          ListHeaderComponent={header}
          ListEmptyComponent={
            list.data === undefined ? (
              <CatalogSkeleton />
            ) : narrowed ? (
              <EmptyState
                icon={SearchX}
                title="Nenhum exercício encontrado"
                message="Tente outro termo ou grupo muscular, ou limpe a busca."
                action={{ label: "Limpar busca", onPress: clear }}
              />
            ) : (
              <EmptyState
                icon={Dumbbell}
                title="Nenhum exercício ainda"
                message="Cadastre exercícios para montar os treinos dos seus alunos."
                action={{ label: "Novo exercício", onPress: () => router.push("/exercicios/novo") }}
              />
            )
          }
          contentContainerStyle={[styles.list, { paddingBottom: tabScreenBottomPadding(insets.bottom) }]}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          refreshControl={
            <RefreshControl
              refreshing={pull.refreshing}
              onRefresh={pull.onRefresh}
              tintColor={colors.primary}
              colors={[colors.primary]}
              progressBackgroundColor={colors.surface}
            />
          }
        />
      )}
    </Screen>
  );
}

/** M - Exercícios (Loading)'s card placeholders. */
function CatalogSkeleton() {
  return (
    <View style={styles.skeleton} accessible accessibilityLabel="Carregando exercícios">
      {[0, 1, 2, 3, 4].map((row) => (
        <View key={row} style={styles.skeletonCard}>
          <Skeleton.Block width={sizes.exerciseThumb} height={sizes.exerciseThumb} />
          <View style={styles.skeletonCol}>
            <Skeleton.Line width="70%" />
            <Skeleton.Line width="40%" />
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  padded: { paddingHorizontal: screenPaddingHorizontal },
  list: { paddingHorizontal: screenPaddingHorizontal, gap: sizes.cardListGap },
  header: { paddingTop: space[3], gap: space[4], paddingBottom: space[1] },
  head: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: space[3] },
  titleCol: { flex: 1, gap: sizes.rowLinesGap },
  chips: { gap: space[2] },
  skeleton: { gap: sizes.cardListGap },
  skeletonCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: space[3],
    padding: sizes.exerciseCardPadding,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  skeletonCol: { flex: 1, gap: space[2] },
});
