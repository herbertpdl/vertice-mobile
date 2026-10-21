import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { router, useLocalSearchParams } from "expo-router";
import { Calendar, Dumbbell, EllipsisVertical, Gauge, Pencil, Trash2 } from "lucide-react-native";
import { useState } from "react";
import { StyleSheet, View } from "react-native";

import { DayRow } from "@/components/domain";
import { NavBar, Screen } from "@/components/layout";
import {
  ActionSheet,
  Badge,
  Button,
  ConfirmDialog,
  ErrorState,
  InfoCard,
  SectionHeader,
  Skeleton,
  StatusBanner,
  Text,
  useToast,
} from "@/components/ui";
import { deleteErrorMessage } from "@/lib/api/errorMessages";
import { fetchStudents, studentQueryKey, studentsQueryKey } from "@/lib/api/students";
import { deleteTrainingPlan, fetchTrainingPlan, trainingPlanQueryKey, trainingPlansQueryKey } from "@/lib/api/trainingPlans";
import type { TrainingPlanDetail, Workout } from "@/lib/api/types";
import { formatDayMonth } from "@/lib/format";
import { DAY_ORDER, PLAN_LEVELS } from "@/lib/labels";
import { useIsOffline } from "@/lib/network";
import { planStatus, planStatusLabels, planStatusTone } from "@/lib/plans";
import { usePullToRefresh } from "@/lib/usePullToRefresh";
import { useRedirectOnError } from "@/lib/useRedirectOnError";
import { radius, sizes, space } from "@/theme";

/** "01 mar – 24 mai 2026": the Info Card's period, always with the year. */
function periodLabel(plan: Pick<TrainingPlanDetail, "startDate" | "endDate">): string {
  return `${formatDayMonth(plan.startDate)} – ${formatDayMonth(plan.endDate)} ${plan.endDate.slice(0, 4)}`;
}

/** A plan's workouts grouped by weekday, Monday first. */
export function workoutsByDay(workouts: Workout[]) {
  return DAY_ORDER.map((day) => ({ day, workouts: workouts.filter((w) => w.dayOfWeek === day) }));
}

/** M - Detalhe do Plano (+ Loading): the plan, its week of workouts, edit / new workout / delete. */
export function PlanDetailScreen() {
  const params = useLocalSearchParams<{ id: string }>();
  const id = Number(params.id);
  const queryClient = useQueryClient();
  const toast = useToast();
  const offline = useIsOffline();
  const [sheet, setSheet] = useState<"actions" | "delete" | null>(null);
  const plan = useQuery({ queryKey: trainingPlanQueryKey(id), queryFn: ({ signal }) => fetchTrainingPlan(id, { signal }) });
  // The student's name for the description line: from the roster, when it's loaded or cached.
  const students = useQuery({ queryKey: studentsQueryKey, queryFn: ({ signal }) => fetchStudents({ signal }) });
  const pull = usePullToRefresh(() => plan.refetch());
  useRedirectOnError(plan.error, "Plano não encontrado.", "/alunos");

  const remove = useMutation({
    mutationFn: () => deleteTrainingPlan(id),
    onSuccess: () => {
      const clientId = plan.data?.clientId;
      setSheet(null);
      if (clientId !== undefined) {
        void queryClient.invalidateQueries({ queryKey: trainingPlansQueryKey(clientId) });
        void queryClient.invalidateQueries({ queryKey: studentQueryKey(clientId) });
      }
      void queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      queryClient.removeQueries({ queryKey: trainingPlanQueryKey(id) });
      if (router.canGoBack()) router.back();
      else router.replace("/alunos");
      toast.show("Plano excluído.");
    },
  });

  const retry = { label: "Tentar", onPress: () => void plan.refetch() };
  const header = (
    <>
      <NavBar
        title="Plano de treino"
        action={plan.data === undefined ? undefined : { icon: EllipsisVertical, accessibilityLabel: "Ações do plano", onPress: () => setSheet("actions") }}
      />
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
        {plan.isError ? <ErrorState onRetry={() => void plan.refetch()} retrying={plan.isFetching} /> : <PlanSkeleton />}
      </Screen>
    );
  }

  const data = plan.data;
  const status = planStatus(data.startDate, data.endDate);
  const studentName = students.data?.find((s) => s.id === data.clientId)?.name;
  const description = [data.description.trim(), studentName === undefined ? "" : `Aluno: ${studentName}.`].filter(Boolean).join(" ");
  const count = data.workouts.length;

  return (
    <>
      <Screen
        header={header}
        refreshing={pull.refreshing}
        onRefresh={pull.onRefresh}
        contentStyle={styles.content}
        footer={
          <View style={styles.footer}>
            <Button label="Editar plano" variant="secondary" style={styles.flex} onPress={() => router.push(`/planos/${id}/editar`)} />
            <Button label="Novo treino" style={styles.flex} onPress={() => router.push(`/planos/${id}/treinos/novo`)} />
          </View>
        }
      >
        <View style={styles.head}>
          <View style={styles.titleRow}>
            <Text variant="headline" accessibilityRole="header" style={styles.flex}>
              {data.name}
            </Text>
            <Badge label={planStatusLabels[status]} tone={planStatusTone[status]} />
          </View>
          {description === "" ? null : (
            <Text variant="bodyRelaxed" color="textSecondary">
              {description}
            </Text>
          )}
        </View>
        <InfoCard
          rows={[
            { icon: Calendar, label: "PERÍODO", value: periodLabel(data) },
            { icon: Gauge, label: "NÍVEL", value: PLAN_LEVELS[data.level] },
            { icon: Dumbbell, label: "TREINOS", value: `${count} ${count === 1 ? "treino" : "treinos"}` },
          ]}
        />
        <View style={styles.week}>
          <SectionHeader title="Treinos da semana" />
          {workoutsByDay(data.workouts).map(({ day, workouts }) => (
            <DayRow
              key={day}
              day={day}
              workouts={workouts}
              onOpenWorkout={(workout) => router.push(`/treinos/${workout.id}`)}
              onAddWorkout={() => router.push(`/planos/${id}/treinos/novo?dayOfWeek=${day}`)}
            />
          ))}
        </View>
      </Screen>

      <ActionSheet
        visible={sheet === "actions"}
        onClose={() => setSheet(null)}
        title={data.name}
        actions={[
          { icon: Pencil, label: "Editar plano", onPress: () => router.push(`/planos/${id}/editar`) },
          { icon: Trash2, label: "Excluir plano", danger: true, onPress: () => setSheet("delete") },
        ]}
      />
      <ConfirmDialog
        visible={sheet === "delete"}
        title="Excluir plano?"
        message={`O plano “${data.name}” e ${count === 1 ? "seu treino serão excluídos" : `seus ${count} treinos serão excluídos`}. Essa ação não pode ser desfeita.`}
        confirmLabel="Excluir plano"
        loading={remove.isPending}
        error={remove.isError ? deleteErrorMessage(remove.error, "trainingPlan", "Não foi possível excluir. Tente novamente.") : undefined}
        onConfirm={() => remove.mutateAsync().catch(() => {})}
        onCancel={() => {
          setSheet(null);
          remove.reset();
        }}
      />
    </>
  );
}

/** M - Detalhe do Plano (Loading). */
function PlanSkeleton() {
  return (
    <View style={styles.content} accessible accessibilityLabel="Carregando plano">
      <Skeleton.Line width="80%" height={sizes.skeletonTitleHeight} />
      <Skeleton.Line width="60%" />
      <Skeleton.Block width="100%" height={sizes.skeletonStatHeight * 1.5} style={styles.rounded} />
      {DAY_ORDER.map((day) => (
        <Skeleton.Block key={day} width="100%" height={sizes.dayRow} style={styles.rounded} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  content: { paddingTop: space[2], gap: space[6] },
  head: { gap: sizes.dayRowGap },
  titleRow: { flexDirection: "row", alignItems: "flex-start", gap: sizes.dayRowGap },
  week: { gap: space[2] },
  footer: { flexDirection: "row", gap: space[3] },
  flex: { flex: 1 },
  rounded: { borderRadius: radius.md },
});
