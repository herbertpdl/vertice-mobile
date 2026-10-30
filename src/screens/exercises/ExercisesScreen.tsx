import { router } from "expo-router";
import { Plus, Search, SearchX } from "lucide-react-native";
import { useState } from "react";
import { FlatList, RefreshControl, ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ExerciseCard } from "@/components/domain";
import { Screen, tabScreenBottomPadding } from "@/components/layout";
import { Chip, EmptyState, ErrorState, IconButton, SearchField, Skeleton, Spinner, StatusBanner, Text } from "@/components/ui";
import type { Exercise } from "@/lib/api/types";
import { useIsOffline } from "@/lib/network";
import { useMuscleGroups } from "@/lib/useCatalog";
import { useExerciseSearch } from "@/lib/useExerciseSearch";
import { usePullToRefresh } from "@/lib/usePullToRefresh";
import { colors, radius, screenPaddingHorizontal, sizes, space } from "@/theme";

/**
 * The match count of the pages loaded so far. With more pages to come only a lower bound is
 * known (the list is never loaded whole), so it says "Mais de N".
 */
export function catalogSubtitle(count: number, hasMore: boolean): string {
  if (hasMore) return `Mais de ${count} exercícios encontrados`;
  return count === 1 ? "1 exercício encontrado" : `${count} exercícios encontrados`;
}

/**
 * M - Catálogo de Exercícios (+ Loading): search, muscle-group chips, the catalog, "Novo exercício".
 * Never the whole catalog: nothing until 3+ letters or a group (lazy-exercise-search), then one
 * page at a time as the list nears its end.
 */
export function ExercisesScreen() {
  const insets = useSafeAreaInsets();
  const offline = useIsOffline();
  const [search, setSearch] = useState("");
  const [muscleGroupId, setMuscleGroupId] = useState<number | null>(null);
  const list = useExerciseSearch(search, muscleGroupId);
  const groups = useMuscleGroups();
  const pull = usePullToRefresh(() => Promise.all([list.idle ? undefined : list.refetch(), groups.refetch()]));
  const retry = {
    label: "Tentar",
    onPress: () => {
      if (list.isFetchNextPageError) void list.fetchNextPage();
      else if (!list.idle) void list.refetch();
      void groups.refetch();
    },
  };
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
          {list.idle ? (
            <Text variant="body" color="textSecondary">
              Busque por nome ou escolha um grupo
            </Text>
          ) : list.isError && list.exercises === undefined ? null : list.exercises === undefined ? (
            <Skeleton.Line width={sizes.skeletonSectionWidth} />
          ) : (
            <Text variant="body" color="textSecondary">
              {catalogSubtitle(list.exercises.length, list.hasNextPage)}
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
        ) : list.isError && list.exercises !== undefined ? (
          <StatusBanner kind="error" action={retry} />
        ) : undefined
      }
    >
      {!list.idle && list.isError && list.exercises === undefined ? (
        <View style={styles.padded}>
          {header}
          <ErrorState onRetry={retry.onPress} retrying={list.isFetching} />
        </View>
      ) : (
        <FlatList<Exercise>
          testID="exercise-list"
          data={list.exercises ?? []}
          keyExtractor={(exercise) => String(exercise.id)}
          renderItem={({ item }) => <ExerciseCard exercise={item} onPress={() => router.push(`/exercicios/${item.id}`)} />}
          ListHeaderComponent={header}
          ListEmptyComponent={
            list.idle ? (
              <EmptyState
                icon={Search}
                title="Busque um exercício"
                message="Digite ao menos 3 letras ou escolha um grupo muscular."
              />
            ) : list.exercises === undefined ? (
              <CatalogSkeleton />
            ) : (
              <EmptyState
                icon={SearchX}
                title="Nenhum exercício encontrado"
                message="Tente outro termo ou grupo muscular, ou limpe a busca."
                action={{ label: "Limpar busca", onPress: clear }}
              />
            )
          }
          onEndReached={() => {
            // `fetchNextPage` ignores `enabled`: while idle it would fetch an unfiltered first page.
            if (!list.idle && list.hasNextPage && !list.isFetchingNextPage && !list.isError) void list.fetchNextPage();
          }}
          onEndReachedThreshold={0.5}
          ListFooterComponent={
            list.isFetchingNextPage ? (
              <View style={styles.more}>
                <Spinner accessibilityLabel="Carregando mais exercícios" />
              </View>
            ) : null
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
  more: { paddingVertical: space[4], alignItems: "center" },
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
