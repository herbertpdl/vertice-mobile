import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import { Plus, SearchX, UserPlus } from "lucide-react-native";
import { useState } from "react";
import { FlatList, RefreshControl, ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { NewStudentSheet, StudentCard, studentsQueryKey } from "@/components/domain";
import { Screen, tabScreenBottomPadding } from "@/components/layout";
import { Chip, EmptyState, ErrorState, IconButton, SearchField, Skeleton, StatusBanner, Text } from "@/components/ui";
import { fetchStudents } from "@/lib/api/students";
import type { ClientSummary } from "@/lib/api/types";
import { useIsOffline } from "@/lib/network";
import { usePullToRefresh } from "@/lib/usePullToRefresh";
import { filterRoster, ROSTER_FILTER_LABELS, rosterSubtitle, type RosterFilter } from "@/lib/students";
import { colors, radius, screenPaddingHorizontal, sizes, space } from "@/theme";

const FILTERS: RosterFilter[] = ["all", "withPlan", "withoutPlan"];

/** M - Alunos (+ Vazio, Loading): the roster, with search, plan filters and "Novo aluno". */
export function StudentsScreen() {
  const insets = useSafeAreaInsets();
  const offline = useIsOffline();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<RosterFilter>("all");
  const [creating, setCreating] = useState(false);
  const students = useQuery({ queryKey: studentsQueryKey, queryFn: () => fetchStudents() });
  const pull = usePullToRefresh(() => students.refetch());
  const retry = { label: "Tentar", onPress: () => void students.refetch() };

  const all = students.data ?? [];
  const shown = filterRoster(all, filter, query);
  const narrowed = query.trim() !== "" || filter !== "all";

  const header = (
    <View style={styles.header}>
      <View style={styles.head}>
        <View style={styles.titleCol}>
          <Text variant="title" accessibilityRole="header">
            Alunos
          </Text>
          {students.data === undefined ? (
            <Skeleton.Line width={160} />
          ) : (
            <Text variant="body" color="textSecondary">
              {rosterSubtitle(all.length, shown.length, narrowed)}
            </Text>
          )}
        </View>
        <IconButton icon={Plus} accessibilityLabel="Novo aluno" onPress={() => setCreating(true)} />
      </View>
      <SearchField value={query} onChangeText={setQuery} placeholder="Buscar aluno" />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
        {FILTERS.map((key) => (
          <Chip key={key} label={ROSTER_FILTER_LABELS[key]} selected={filter === key} onPress={() => setFilter(key)} />
        ))}
      </ScrollView>
    </View>
  );

  return (
    <Screen
      scroll={false}
      header={
        offline ? (
          <StatusBanner kind="offline" action={retry} />
        ) : students.isError && students.data !== undefined ? (
          <StatusBanner kind="error" action={retry} />
        ) : undefined
      }
    >
      {students.isError && students.data === undefined ? (
        <View style={styles.padded}>
          {header}
          <ErrorState onRetry={() => void students.refetch()} retrying={students.isFetching} />
        </View>
      ) : (
        <FlatList<ClientSummary>
          data={shown}
          keyExtractor={(student) => String(student.id)}
          renderItem={({ item }) => <StudentCard student={item} onPress={() => router.push(`/alunos/${item.id}`)} />}
          ListHeaderComponent={header}
          ListEmptyComponent={
            students.data === undefined ? (
              <RosterSkeleton />
            ) : narrowed ? (
              <EmptyState
                icon={SearchX}
                title="Nenhum aluno encontrado"
                message="Tente outro termo ou limpe a busca para ver todos os alunos."
                action={{
                  label: "Limpar busca",
                  onPress: () => {
                    setQuery("");
                    setFilter("all");
                  },
                }}
              />
            ) : (
              <EmptyState
                icon={UserPlus}
                title="Nenhum aluno ainda"
                message="Cadastre seu primeiro aluno para montar planos e acompanhar os treinos."
                action={{ label: "Novo aluno", onPress: () => setCreating(true) }}
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
      <NewStudentSheet visible={creating} onClose={() => setCreating(false)} />
    </Screen>
  );
}

/** M - Alunos (Loading)'s card placeholders. */
function RosterSkeleton() {
  return (
    <View style={styles.skeleton} accessible accessibilityLabel="Carregando alunos">
      {[0, 1, 2, 3].map((row) => (
        <View key={row} style={styles.skeletonCard}>
          <View style={styles.skeletonTop}>
            <Skeleton.Circle size={48} />
            <View style={styles.skeletonCol}>
              <Skeleton.Line width="60%" />
              <Skeleton.Line width="40%" />
            </View>
          </View>
          <Skeleton.Line width="100%" />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  padded: { paddingHorizontal: screenPaddingHorizontal },
  list: { paddingHorizontal: screenPaddingHorizontal, gap: 10 },
  header: { paddingTop: space[3], gap: space[4], paddingBottom: space[1] },
  head: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: space[3] },
  titleCol: { flex: 1, gap: 3 },
  chips: { gap: space[2] },
  skeleton: { gap: 10 },
  skeletonCard: {
    padding: sizes.studentCardPadding,
    gap: sizes.studentCardPadding,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  skeletonTop: { flexDirection: "row", alignItems: "center", gap: space[3] },
  skeletonCol: { flex: 1, gap: space[2] },
});
