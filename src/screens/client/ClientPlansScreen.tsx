import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import { ClipboardList } from "lucide-react-native";
import { StyleSheet, View } from "react-native";

import { PlanCard } from "@/components/domain";
import { Screen } from "@/components/layout";
import { EmptyState, ErrorState, Skeleton, StatusBanner, Text } from "@/components/ui";
import { fetchTrainingPlans, myPlansQueryKey } from "@/lib/api/trainingPlans";
import type { TrainingPlan } from "@/lib/api/types";
import { todayLocalIso } from "@/lib/format";
import { useIsOffline } from "@/lib/network";
import { planStatus, sortPlans, type PlanStatus } from "@/lib/plans";
import { usePullToRefresh } from "@/lib/usePullToRefresh";
import { sizes, space } from "@/theme";

const GROUPS: { status: PlanStatus; title: string }[] = [
  { status: "active", title: "EM ANDAMENTO" },
  { status: "scheduled", title: "PRÓXIMOS" },
  { status: "completed", title: "ENCERRADOS" },
];

/** The client's plans in the A - Planos groups, each in `sortPlans` order (PRD R10). */
export function groupPlans(plans: TrainingPlan[], today: string = todayLocalIso()) {
  const sorted = sortPlans(plans, today);
  return GROUPS.map((group) => ({ ...group, plans: sorted.filter((p) => planStatus(p.startDate, p.endDate, today) === group.status) })).filter(
    (group) => group.plans.length > 0,
  );
}

/** A - Planos: every plan assigned to the client — active, upcoming, ended — each opening read-only. */
export function ClientPlansScreen() {
  const offline = useIsOffline();
  const plans = useQuery({ queryKey: myPlansQueryKey, queryFn: ({ signal }) => fetchTrainingPlans(undefined, { signal }) });
  const pull = usePullToRefresh(() => plans.refetch());
  const retry = { label: "Tentar", onPress: () => void plans.refetch() };

  return (
    <Screen
      inTabs
      refreshing={pull.refreshing}
      onRefresh={pull.onRefresh}
      contentStyle={styles.content}
      header={
        offline ? (
          <StatusBanner kind="offline" action={retry} />
        ) : plans.isError && plans.data !== undefined ? (
          <StatusBanner kind="error" action={retry} />
        ) : undefined
      }
    >
      <Text variant="title" accessibilityRole="header">
        Planos
      </Text>
      {plans.data === undefined ? (
        plans.isError ? (
          <ErrorState onRetry={() => void plans.refetch()} retrying={plans.isFetching} />
        ) : (
          <View style={styles.group} accessible accessibilityLabel="Carregando planos">
            {[0, 1, 2].map((i) => (
              <Skeleton.Block key={i} width="100%" height={sizes.skeletonPlanCardHeight} />
            ))}
          </View>
        )
      ) : plans.data.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title="Nenhum plano ainda"
          message="Quando seu treinador montar um plano para você, ele aparece aqui."
        />
      ) : (
        groupPlans(plans.data).map((group) => (
          <View key={group.status} style={styles.group}>
            <Text variant="overline" color="textSecondary" accessibilityRole="header">
              {group.title}
            </Text>
            {group.plans.map((plan) => (
              <PlanCard key={plan.id} plan={plan} onPress={() => router.push(`/aluno/planos/${plan.id}`)} />
            ))}
          </View>
        ))
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingTop: space[3], gap: space[6] },
  group: { gap: sizes.cardListGap },
});
