import { useQuery } from "@tanstack/react-query";
import { router, useLocalSearchParams } from "expo-router";
import { Calendar, Dumbbell, Gauge } from "lucide-react-native";
import { StyleSheet, View } from "react-native";

import { DayRow } from "@/components/domain";
import { NavBar, Screen } from "@/components/layout";
import { Badge, Banner, ErrorState, InfoCard, SectionHeader, Skeleton, StatusBanner, Text } from "@/components/ui";
import { fetchTrainingPlan, trainingPlanQueryKey } from "@/lib/api/trainingPlans";
import { formatDayMonth, formatPlanPeriod } from "@/lib/format";
import { DAY_ORDER, PLAN_LEVELS } from "@/lib/labels";
import { useIsOffline } from "@/lib/network";
import { planStatus, planStatusLabels, planStatusTone, type PlanStatus } from "@/lib/plans";
import { usePullToRefresh } from "@/lib/usePullToRefresh";
import { useRedirectOnError } from "@/lib/useRedirectOnError";
import { radius, sizes, space } from "@/theme";
import { workoutsByDay } from "@/screens/plans/PlanDetailScreen";

/** The read-only notice of a plan the client can't train on (PRD R11, R12); none for the active one. */
export function readOnlyNotice(status: PlanStatus, startDate: string): string | undefined {
  if (status === "completed") return "Plano encerrado — somente visualização. Toque em um treino para ver exercícios e séries.";
  if (status === "scheduled") return `Este plano começa em ${formatDayMonth(startDate)}. Até lá, é só para consulta.`;
  return undefined;
}

/** A - Detalhe do Plano (client, read-only): the plan, its info and its week; workouts open read-only. */
export function ClientPlanScreen() {
  const params = useLocalSearchParams<{ id: string }>();
  const id = Number(params.id);
  const offline = useIsOffline();
  const plan = useQuery({ queryKey: trainingPlanQueryKey(id), queryFn: ({ signal }) => fetchTrainingPlan(id, { signal }) });
  const pull = usePullToRefresh(() => plan.refetch());
  useRedirectOnError(plan.error, "Plano não encontrado.", "/aluno/planos");

  const retry = { label: "Tentar", onPress: () => void plan.refetch() };
  const header = (
    <>
      <NavBar title="Plano de treino" />
      {offline ? (
        <StatusBanner kind="offline" action={retry} />
      ) : plan.isError && plan.data !== undefined ? (
        <StatusBanner kind="error" action={retry} />
      ) : null}
    </>
  );

  if (plan.data === undefined) {
    return (
      <Screen header={header} contentStyle={styles.content}>
        {plan.isError ? (
          <ErrorState onRetry={() => void plan.refetch()} retrying={plan.isFetching} />
        ) : (
          <View style={styles.content} accessible accessibilityLabel="Carregando plano">
            <Skeleton.Line width="80%" height={sizes.skeletonTitleHeight} />
            <Skeleton.Block width="100%" height={sizes.skeletonInfoCardHeight} style={styles.rounded} />
            {DAY_ORDER.map((day) => (
              <Skeleton.Block key={day} width="100%" height={sizes.dayRow} style={styles.rounded} />
            ))}
          </View>
        )}
      </Screen>
    );
  }

  const data = plan.data;
  const status = planStatus(data.startDate, data.endDate);
  const notice = readOnlyNotice(status, data.startDate);
  const count = data.workouts.length;

  return (
    <Screen header={header} refreshing={pull.refreshing} onRefresh={pull.onRefresh} contentStyle={styles.content}>
      <View style={styles.head}>
        <View style={styles.titleRow}>
          <Text variant="headline" accessibilityRole="header" style={styles.flex}>
            {data.name}
          </Text>
          <Badge label={planStatusLabels[status]} tone={planStatusTone[status]} />
        </View>
        {data.description.trim() === "" ? null : (
          <Text variant="bodyRelaxed" color="textSecondary">
            {data.description.trim()}
          </Text>
        )}
      </View>
      {notice === undefined ? null : <Banner tone="info" message={notice} />}
      <InfoCard
        rows={[
          { icon: Calendar, label: "PERÍODO", value: formatPlanPeriod(data.startDate, data.endDate) },
          { icon: Gauge, label: "NÍVEL", value: PLAN_LEVELS[data.level] },
          { icon: Dumbbell, label: "TREINOS", value: `${count} ${count === 1 ? "treino" : "treinos"}` },
        ]}
      />
      <View style={styles.week}>
        <SectionHeader title="Treinos da semana" />
        {workoutsByDay(data.workouts).map(({ day, workouts }) => (
          <DayRow key={day} day={day} workouts={workouts} onOpenWorkout={(workout) => router.push(`/aluno/treinos/${workout.id}`)} />
        ))}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingTop: space[2], gap: space[6] },
  head: { gap: sizes.dayRowGap },
  titleRow: { flexDirection: "row", alignItems: "flex-start", gap: sizes.dayRowGap },
  week: { gap: space[2] },
  flex: { flex: 1 },
  rounded: { borderRadius: radius.md },
});
