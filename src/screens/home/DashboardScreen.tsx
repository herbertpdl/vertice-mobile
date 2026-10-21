import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import type { ReactNode } from "react";
import { StyleSheet, View } from "react-native";

import { CompletedWorkoutRow, FeedbackRow, PlanEndingRow } from "@/components/domain";
import { Screen } from "@/components/layout/Screen";
import { ErrorState, SectionHeader, Skeleton, StatCard, StatusBanner, Text } from "@/components/ui";
import { fetchDashboard } from "@/lib/api/dashboard";
import type { DashboardData } from "@/lib/api/types";
import { useMe } from "@/lib/auth";
import { greetingFor } from "@/lib/format";
import { useIsOffline } from "@/lib/network";
import { usePullToRefresh } from "@/lib/usePullToRefresh";
import { radius, screenPaddingHorizontal, sizes, space } from "@/theme";

export const dashboardQueryKey = ["dashboard"] as const;

/** How many rows each dashboard section shows (the design's three). */
const SECTION_ROWS = 3;

function plural(count: number, one: string, many: string): string {
  return `${count} ${count === 1 ? one : many}`;
}

/**
 * "6 feedbacks · 3 planos terminando" under the greeting. The BFF's `recentFeedbackCount` counts
 * every feedback (no time window) and `expiringPlans` covers 14 days, so the copy says what the
 * numbers are rather than the design's "novos" / "7 dias" (decisions log).
 */
export function dashboardSummary({ stats }: DashboardData): string {
  return [
    plural(stats.recentFeedbackCount, "feedback", "feedbacks"),
    plural(stats.expiringPlansCount, "plano terminando", "planos terminando"),
  ].join(" · ");
}

/** Today's completed workouts, newest first, as many as a section shows. */
export function latestCompleted(data: DashboardData): DashboardData["completedToday"] {
  return [...data.completedToday].sort((a, b) => b.completedAt.localeCompare(a.completedAt)).slice(0, SECTION_ROWS);
}

/** M - Dashboard (+ Loading, Offline): the Início tab. */
export function DashboardScreen() {
  const { data: me } = useMe();
  const offline = useIsOffline();
  const dashboard = useQuery({ queryKey: dashboardQueryKey, queryFn: ({ signal }) => fetchDashboard({ signal }) });
  const pull = usePullToRefresh(() => dashboard.refetch());
  const firstName = me?.name.trim().split(/\s+/)[0] ?? "";
  const retry = { label: "Tentar", onPress: () => void dashboard.refetch() };

  // Offline first (a cold start offline leaves the query paused, not failed), then a failed
  // refresh over cached data — which keeps the data on screen.
  const banner = offline ? (
    <StatusBanner kind="offline" action={retry} />
  ) : dashboard.isError && dashboard.data !== undefined ? (
    <StatusBanner kind="error" action={retry} />
  ) : undefined;

  if (dashboard.data === undefined && !dashboard.isError) return <DashboardSkeleton header={banner} />;

  return (
    <Screen inTabs refreshing={pull.refreshing} onRefresh={pull.onRefresh} header={banner} contentStyle={styles.content}>
      {dashboard.data === undefined ? (
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
  const done = latestCompleted(data);
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
          <StatCard label="Feedbacks" value={String(stats.recentFeedbackCount)} helper="recebidos no total" />
          <StatCard label="Planos vencendo" value={String(stats.expiringPlansCount)} helper="próximos 14 dias" />
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
            <FeedbackRow
              key={item.id}
              feedback={item}
              last={index === feedback.length - 1}
              onPress={() => router.push(`/alunos/${item.clientId}`)}
            />
          ))
        )}
      </View>

      <View style={styles.section}>
        <SectionHeader title="Planos perto do fim" />
        {ending.length === 0 ? (
          <EmptyLine text="Nenhum plano vencendo em breve." />
        ) : (
          ending.map((plan, index) => (
            <PlanEndingRow key={`${plan.student}-${plan.name}-${plan.end}`} plan={plan} last={index === ending.length - 1} />
          ))
        )}
      </View>

      <View style={styles.section}>
        <SectionHeader title="Treinos concluídos hoje" />
        {done.length === 0 ? (
          <EmptyLine text="Nenhum treino concluído ainda hoje." />
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

/** M - Dashboard (Loading). Carries the offline banner too: offline at launch, it is all there is. */
export function DashboardSkeleton({ header }: { header?: ReactNode }) {
  return (
    <Screen inTabs scroll={false} header={header} contentStyle={styles.skeleton}>
      <View accessible accessibilityLabel="Carregando o início" style={styles.content}>
        <View style={styles.greeting}>
          <Skeleton.Line width={sizes.skeletonTitleWidth} height={sizes.skeletonTitleHeight} />
          <Skeleton.Line width={sizes.skeletonSubtitleWidth} />
        </View>
        <View style={styles.grid}>
          {[0, 1].map((row) => (
            <View key={row} style={styles.gridRow}>
              <Skeleton.Block width="48%" height={sizes.skeletonStatHeight} style={styles.skeletonCard} />
              <Skeleton.Block width="48%" height={sizes.skeletonStatHeight} style={styles.skeletonCard} />
            </View>
          ))}
        </View>
        <Skeleton.Line width={sizes.skeletonSectionWidth} height={sizes.skeletonSectionHeight} />
        {[0, 1, 2, 3].map((row) => (
          <View key={row} style={styles.skeletonRow}>
            <Skeleton.Circle size={sizes.skeletonAvatar} />
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
  content: { paddingTop: space[3], gap: sizes.dashboardGroupGap },
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
