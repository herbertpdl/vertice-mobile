import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import { StyleSheet, View } from "react-native";

import { CompletedWorkoutRow, FeedbackRow, PlanEndingRow } from "@/components/domain";
import { Screen } from "@/components/layout/Screen";
import { ErrorState, SectionHeader, Skeleton, StatCard, StatusBanner, Text } from "@/components/ui";
import { fetchDashboard } from "@/lib/api/dashboard";
import type { DashboardData } from "@/lib/api/types";
import { useMe } from "@/lib/auth";
import { greetingFor } from "@/lib/format";
import { useIsOffline } from "@/lib/network";
import { radius, screenPaddingHorizontal, sizes, space } from "@/theme";

export const dashboardQueryKey = ["dashboard"] as const;

/** How many rows each dashboard section shows (the design's three). */
const SECTION_ROWS = 3;

function plural(count: number, one: string, many: string): string {
  return `${count} ${count === 1 ? one : many}`;
}

/** "6 feedbacks novos · 3 planos terminando" under the greeting. */
export function dashboardSummary({ stats }: DashboardData): string {
  return [
    plural(stats.recentFeedbackCount, "feedback novo", "feedbacks novos"),
    plural(stats.expiringPlansCount, "plano terminando", "planos terminando"),
  ].join(" · ");
}

/** M - Dashboard (+ Loading, Offline): the Início tab. */
export function DashboardScreen() {
  const { data: me } = useMe();
  const offline = useIsOffline();
  const dashboard = useQuery({ queryKey: dashboardQueryKey, queryFn: ({ signal }) => fetchDashboard({ signal }) });
  const firstName = me?.name.trim().split(/\s+/)[0] ?? "";

  if (dashboard.isPending) return <DashboardSkeleton />;

  return (
    <Screen
      inTabs
      refreshing={dashboard.isRefetching}
      onRefresh={() => void dashboard.refetch()}
      header={offline ? <StatusBanner kind="offline" /> : undefined}
      contentStyle={styles.content}
    >
      {dashboard.isError ? (
        <ErrorState onRetry={() => void dashboard.refetch()} retrying={dashboard.isFetching} />
      ) : (
        <DashboardContent data={dashboard.data} firstName={firstName} />
      )}
    </Screen>
  );
}

function DashboardContent({ data, firstName }: { data: DashboardData; firstName: string }) {
  const { stats } = data;
  const feedback = data.recentFeedback.slice(0, SECTION_ROWS);
  const ending = data.expiringPlans.slice(0, SECTION_ROWS);
  const done = data.completedToday;
  return (
    <>
      <View style={styles.greeting}>
        <Text variant="title" accessibilityRole="header">
          {firstName === "" ? greetingFor() : `${greetingFor()}, ${firstName}`}
        </Text>
        <Text variant="body" color="textSecondary">
          {dashboardSummary(data)}
        </Text>
      </View>

      <View style={styles.grid}>
        <View style={styles.gridRow}>
          <StatCard label="Alunos ativos" value={String(stats.activeClients)} helper="com vínculo ativo" />
          <StatCard label="Planos ativos" value={String(stats.activePlans)} helper="em andamento" />
        </View>
        <View style={styles.gridRow}>
          <StatCard label="Feedbacks novos" value={String(stats.recentFeedbackCount)} helper="últimos 7 dias" />
          <StatCard label="Planos vencendo" value={String(stats.expiringPlansCount)} helper="próximos 7 dias" />
        </View>
      </View>

      <View style={styles.section}>
        <SectionHeader
          title="Feedbacks recentes"
          action={data.recentFeedback.length > 0 ? { label: "Ver todos", onPress: () => router.push("/feedbacks") } : undefined}
        />
        {feedback.length === 0 ? (
          <EmptyLine text="Nenhum feedback recente." />
        ) : (
          feedback.map((item, index) => (
            <FeedbackRow key={item.id} feedback={item} last={index === feedback.length - 1} />
          ))
        )}
      </View>

      <View style={styles.section}>
        <SectionHeader title="Planos perto do fim" />
        {ending.length === 0 ? (
          <EmptyLine text="Nenhum plano termina nos próximos dias." />
        ) : (
          ending.map((plan, index) => (
            <PlanEndingRow key={`${plan.student}-${plan.name}-${plan.end}`} plan={plan} last={index === ending.length - 1} />
          ))
        )}
      </View>

      <View style={styles.section}>
        <SectionHeader title="Treinos concluídos hoje" />
        {done.length === 0 ? (
          <EmptyLine text="Nenhum treino concluído hoje ainda." />
        ) : (
          done.map((item, index) => (
            <CompletedWorkoutRow key={`${item.student}-${item.completedAt}`} item={item} last={index === done.length - 1} />
          ))
        )}
      </View>
    </>
  );
}

function EmptyLine({ text }: { text: string }) {
  return (
    <Text variant="body" color="textSecondary" style={styles.emptyLine}>
      {text}
    </Text>
  );
}

/** M - Dashboard (Loading). */
export function DashboardSkeleton() {
  return (
    <Screen inTabs scroll={false} contentStyle={styles.skeleton}>
      <View accessible accessibilityLabel="Carregando o início" style={styles.content}>
        <View style={styles.greeting}>
          <Skeleton.Line width={190} height={24} />
          <Skeleton.Line width={240} />
        </View>
        <View style={styles.grid}>
          {[0, 1].map((row) => (
            <View key={row} style={styles.gridRow}>
              <Skeleton.Block width="48%" height={96} style={styles.skeletonCard} />
              <Skeleton.Block width="48%" height={96} style={styles.skeletonCard} />
            </View>
          ))}
        </View>
        <Skeleton.Line width={150} height={16} />
        {[0, 1, 2, 3].map((row) => (
          <View key={row} style={styles.skeletonRow}>
            <Skeleton.Circle size={44} />
            <View style={styles.skeletonText}>
              <Skeleton.Line width="100%" />
              <Skeleton.Line width="50%" />
            </View>
          </View>
        ))}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingTop: space[3], gap: sizes.authGroupGap },
  greeting: { gap: space[1] },
  grid: { gap: space[3] },
  gridRow: { flexDirection: "row", gap: space[3] },
  section: { gap: space[1] },
  emptyLine: { paddingVertical: space[3] },
  skeleton: { paddingHorizontal: screenPaddingHorizontal },
  skeletonCard: { flex: 1, borderRadius: radius.lg },
  skeletonRow: { flexDirection: "row", alignItems: "center", gap: space[4] },
  skeletonText: { flex: 1, gap: space[2] },
});
