import { useQuery } from "@tanstack/react-query";
import { useLocalSearchParams } from "expo-router";
import { StyleSheet, View } from "react-native";

import { NavBar, Screen } from "@/components/layout";
import { ErrorState, Skeleton, StatusBanner, Text } from "@/components/ui";
import type { FullWorkoutExercise } from "@/lib/api/types";
import { fetchFullWorkout, fullWorkoutQueryKey } from "@/lib/api/workouts";
import { DAY_NAMES } from "@/lib/labels";
import { useIsOffline } from "@/lib/network";
import { usePullToRefresh } from "@/lib/usePullToRefresh";
import { useRedirectOnError } from "@/lib/useRedirectOnError";
import { exerciseSummary, prescribedLoad, setTarget } from "@/lib/workoutText";
import { colors, radius, sizes, space } from "@/theme";

/**
 * A - Detalhe do Treino (Leitura): a workout's exercises and their sets as the trainer prescribed
 * them, read-only (PRD R11) — from any of the client's plans. Training starts only from Início.
 */
export function ClientWorkoutViewScreen() {
  const params = useLocalSearchParams<{ id: string }>();
  const id = Number(params.id);
  const offline = useIsOffline();
  const workout = useQuery({ queryKey: fullWorkoutQueryKey(id), queryFn: ({ signal }) => fetchFullWorkout(id, { signal }) });
  const pull = usePullToRefresh(() => workout.refetch());
  useRedirectOnError(workout.error, "Treino não encontrado.", "/aluno/planos");

  const retry = { label: "Tentar", onPress: () => void workout.refetch() };
  const header = (
    <>
      <NavBar title="Treino" />
      {offline ? (
        <StatusBanner kind="offline" action={retry} />
      ) : workout.isError && workout.data !== undefined ? (
        <StatusBanner kind="error" action={retry} />
      ) : null}
    </>
  );

  const data = workout.data;
  return (
    <Screen header={header} refreshing={pull.refreshing} onRefresh={pull.onRefresh} contentStyle={styles.content}>
      {data === undefined ? (
        workout.isError ? (
          <ErrorState onRetry={() => void workout.refetch()} retrying={workout.isFetching} />
        ) : (
          <View style={styles.content} accessible accessibilityLabel="Carregando treino">
            <Skeleton.Line width="70%" height={sizes.skeletonTitleHeight} />
            {[0, 1, 2, 3].map((i) => (
              <Skeleton.Block key={i} width="100%" height={sizes.skeletonCardHeight} style={styles.rounded} />
            ))}
          </View>
        )
      ) : (
        <>
          <View style={styles.head}>
            <Text variant="headline" accessibilityRole="header">
              {data.name}
            </Text>
            <Text variant="caption" color="textSecondary">
              {`${DAY_NAMES[data.dayOfWeek]} · ${data.exercises.length} ${data.exercises.length === 1 ? "exercício" : "exercícios"}`}
            </Text>
          </View>
          {data.exercises.length === 0 ? (
            <Text variant="body" color="textSecondary">
              Seu treinador ainda não adicionou exercícios a este treino.
            </Text>
          ) : (
            [...data.exercises]
              .sort((a, b) => a.order - b.order)
              .map((exercise, index) => <ExerciseCard key={exercise.id} exercise={exercise} index={index + 1} />)
          )}
        </>
      )}
    </Screen>
  );
}

function ExerciseCard({ exercise, index }: { exercise: FullWorkoutExercise; index: number }) {
  return (
    <View style={styles.card}>
      <View style={styles.disc}>
        <Text variant="label" weight="bold" color="textSecondary" allowFontScaling={false}>
          {index}
        </Text>
      </View>
      <View style={styles.col}>
        <Text variant="bodyMdStrong">{exercise.exercise.name}</Text>
        <Text variant="caption" color="textSecondary">
          {exerciseSummary(exercise)}
        </Text>
        {exercise.notes.trim() === "" ? null : (
          <Text variant="small" color="textTertiary">
            {exercise.notes.trim()}
          </Text>
        )}
        <View style={styles.sets}>
          {[...exercise.sets]
            .sort((a, b) => a.setNumber - b.setNumber)
            .map((set) => (
              <Text key={set.id} variant="small" color="textSecondary">
                {[`Série ${set.setNumber}: ${setTarget(set)}`, prescribedLoad(set), set.notes.trim()].filter(Boolean).join(" · ")}
              </Text>
            ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { paddingTop: space[2], gap: space[4] },
  head: { gap: sizes.exerciseCardLinesGap },
  card: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: space[3],
    padding: sizes.studentCardPadding,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  disc: {
    width: sizes.stepRowIndex,
    height: sizes.stepRowIndex,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceActive,
    alignItems: "center",
    justifyContent: "center",
  },
  col: { flex: 1, gap: sizes.rowLinesGap },
  sets: { gap: sizes.rowLinesGapTight, paddingTop: space[1] },
  rounded: { borderRadius: radius.lg },
});
