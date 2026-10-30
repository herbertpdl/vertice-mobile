import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { router, useLocalSearchParams } from "expo-router";
import { ChartNoAxesColumn, ClipboardList, EllipsisVertical, Link, MessageSquare, Pencil, UserX } from "lucide-react-native";
import { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";

import {
  AccessLinkSheet,
  EditStudentSheet,
  FeedbackRow,
  PlanCard,
  recentWeeks,
  WeightChart,
} from "@/components/domain";
import { NavBar, Screen } from "@/components/layout";
import {
  ActionSheet,
  Avatar,
  Badge,
  Button,
  ConfirmDialog,
  EmptyState,
  ErrorState,
  SegmentedTabs,
  SelectField,
  Skeleton,
  StatCard,
  StatusBanner,
  Text,
  useToast,
} from "@/components/ui";
import { apiErrorMessage } from "@/lib/api/errorMessages";
import { dashboardQueryKey } from "@/lib/api/dashboard";
import { allExercisesQueryKey, exerciseProgressQueryKey, fetchAllExercises, fetchExerciseProgress } from "@/lib/api/exercises";
import { feedbackQueryKey, fetchFeedback } from "@/lib/api/feedback";
import { endStudentRelationship, fetchStudentOverview, studentQueryKey, studentsQueryKey } from "@/lib/api/students";
import { fetchTrainingPlans, trainingPlansQueryKey } from "@/lib/api/trainingPlans";
import type { StudentDetailOverview } from "@/lib/api/types";
import { formatPlanRange, formatRecentInstant, formatTimeOfDay } from "@/lib/format";
import { useIsOffline } from "@/lib/network";
import { sortPlans } from "@/lib/plans";
import { usePullToRefresh } from "@/lib/usePullToRefresh";
import { useRedirectOnError } from "@/lib/useRedirectOnError";
import { controls, radius, sizes, space } from "@/theme";

type Tab = "plans" | "feedback" | "progress";

/** How many of a student's feedback entries the tab lists (newest first). */
const FEEDBACK_SHOWN = 20;

/**
 * "Hoje" / "às 07:40" for the Último treino card (the day part of `formatRecentInstant`'s
 * "Hoje, 07:40" / "Ontem, 19:12" / "Seg, 18:40" / "24 mai, 08:02"); "—" / "nenhum ainda" without one.
 */
export function lastWorkoutStat(lastWorkoutAt: string | null, now: Date = new Date()): { value: string; helper: string } {
  if (lastWorkoutAt === null) return { value: "—", helper: "nenhum ainda" };
  const day = formatRecentInstant(lastWorkoutAt, { withDay: true, now }).split(", ")[0];
  return { value: day, helper: `às ${formatTimeOfDay(lastWorkoutAt)}` };
}

/** M - Detalhe do Aluno (+ Feedbacks, Progresso, Loading): one student, their plans, feedback and loads. */
export function StudentDetailScreen() {
  const params = useLocalSearchParams<{ id: string }>();
  const id = Number(params.id);
  const validId = Number.isInteger(id) && id > 0;
  const queryClient = useQueryClient();
  const toast = useToast();
  const offline = useIsOffline();
  const [tab, setTab] = useState<Tab>("plans");
  const [sheet, setSheetState] = useState<"actions" | "edit" | "link" | "end" | null>(null);
  // Sheets are remounted per opening (fresh form), and the link sheet again on close, so an
  // issued token doesn't stay in memory once the sheet is gone.
  const [sheetKey, setSheetKey] = useState(0);
  const setSheet = (next: typeof sheet) => {
    if (next === "edit" || next === "link" || sheet === "link") setSheetKey((key) => key + 1);
    setSheetState(next);
  };
  // Lifted here so switching tabs keeps the chosen exercise.
  const [exerciseId, setExerciseId] = useState<string | null>(null);

  const overview = useQuery({ queryKey: studentQueryKey(id), queryFn: () => fetchStudentOverview(id), enabled: validId });
  const plans = useQuery({
    queryKey: trainingPlansQueryKey(id),
    queryFn: ({ signal }) => fetchTrainingPlans(id, { signal }),
    enabled: validId,
  });
  const feedback = useQuery({ queryKey: feedbackQueryKey, queryFn: ({ signal }) => fetchFeedback({ signal }) });
  const mine = (feedback.data ?? []).filter((item) => item.clientId === id);
  const refetchAll = () => Promise.all([overview.refetch(), plans.refetch(), feedback.refetch()]);
  const pull = usePullToRefresh(refetchAll);
  useRedirectOnError(overview.error, "Aluno não encontrado.", "/alunos");
  useInvalidIdRedirect(validId);

  const end = useMutation({
    mutationFn: () => endStudentRelationship(id),
    onSuccess: () => {
      setSheet(null);
      void queryClient.invalidateQueries({ queryKey: studentsQueryKey });
      void queryClient.invalidateQueries({ queryKey: dashboardQueryKey });
      // The ended student's data is stale now, but this screen still observes it: mark it stale
      // without refetching (a refetch would 403 and bounce a second time — the web's same rule).
      void queryClient.invalidateQueries({ queryKey: studentQueryKey(id), refetchType: "none" });
      void queryClient.invalidateQueries({ queryKey: trainingPlansQueryKey(id), refetchType: "none" });
      // Back to the roster, whichever screen led here (Início, Feedbacks, Alunos).
      router.dismissTo("/alunos");
      toast.show("Vínculo encerrado.");
    },
  });

  const student = overview.data?.student;
  const header = (
    <>
      <NavBar
        title="Aluno"
        action={
          student === undefined
            ? undefined
            : { icon: EllipsisVertical, accessibilityLabel: "Ações do aluno", onPress: () => setSheet("actions") }
        }
      />
      {offline ? (
        <StatusBanner kind="offline" action={{ label: "Tentar", onPress: () => void refetchAll() }} />
      ) : [overview, plans, feedback].some((q) => q.isError && q.data !== undefined) ? (
        <StatusBanner kind="error" action={{ label: "Tentar", onPress: () => void refetchAll() }} />
      ) : null}
    </>
  );

  if (overview.data === undefined) {
    return (
      <Screen header={header} contentStyle={styles.content}>
        {overview.isError ? (
          <ErrorState onRetry={() => void overview.refetch()} retrying={overview.isFetching} />
        ) : (
          <DetailSkeleton />
        )}
      </Screen>
    );
  }

  const data = overview.data;
  return (
    <>
      <Screen
        header={header}
        refreshing={pull.refreshing}
        onRefresh={pull.onRefresh}
        contentStyle={styles.content}
        footer={tab === "plans" ? <Button label="Novo plano" onPress={() => router.push(`/planos/novo?clientId=${id}`)} /> : undefined}
      >
        <Identity data={data} />
        <Stats data={data} />
        <SegmentedTabs<Tab>
          value={tab}
          onChange={setTab}
          tabs={[
            { key: "plans", label: "Planos" },
            { key: "feedback", label: "Feedbacks", count: mine.length },
            { key: "progress", label: "Progresso" },
          ]}
        />
        {tab === "plans" ? (
          plans.data === undefined ? (
            plans.isError ? (
              <ErrorState onRetry={() => void plans.refetch()} retrying={plans.isFetching} />
            ) : (
              <ListSkeleton />
            )
          ) : plans.data.length === 0 ? (
            <EmptyState icon={ClipboardList} title="Nenhum plano ainda" message="Crie o primeiro plano de treino deste aluno." />
          ) : (
            <View style={styles.list}>
              {sortPlans(plans.data).map((plan) => (
                <PlanCard key={plan.id} plan={plan} onPress={() => router.push(`/planos/${plan.id}`)} />
              ))}
            </View>
          )
        ) : tab === "feedback" ? (
          feedback.data === undefined ? (
            feedback.isError ? (
              <ErrorState onRetry={() => void feedback.refetch()} retrying={feedback.isFetching} />
            ) : (
              <ListSkeleton />
            )
          ) : mine.length === 0 ? (
            <EmptyState icon={MessageSquare} title="Nenhum feedback ainda" message="Os comentários que o aluno deixa ao concluir um treino aparecem aqui." />
          ) : (
            <View>
              {mine.slice(0, FEEDBACK_SHOWN).map((item, index, shown) => (
                <FeedbackRow key={item.id} feedback={item} perspective="student" withDay last={index === shown.length - 1} />
              ))}
              {mine.length > FEEDBACK_SHOWN ? (
                <Text variant="caption" color="textSecondary" style={styles.more}>
                  {`Mostrando os ${FEEDBACK_SHOWN} mais recentes de ${mine.length}.`}
                </Text>
              ) : null}
            </View>
          )
        ) : (
          <ProgressTab clientId={id} exerciseId={exerciseId} onExerciseChange={setExerciseId} />
        )}
      </Screen>

      <ActionSheet
        visible={sheet === "actions"}
        onClose={() => setSheet(null)}
        title={data.student.name}
        actions={[
          { icon: Pencil, label: "Editar aluno", onPress: () => setSheet("edit") },
          { icon: Link, label: "Link de acesso", onPress: () => setSheet("link") },
          { icon: UserX, label: "Encerrar vínculo", danger: true, onPress: () => setSheet("end") },
        ]}
      />
      <EditStudentSheet key={`edit-${sheetKey}`} student={data.student} visible={sheet === "edit"} onClose={() => setSheet(null)} />
      <AccessLinkSheet
        key={`link-${sheetKey}`}
        studentId={id}
        studentName={data.student.name}
        visible={sheet === "link"}
        onClose={() => setSheet(null)}
      />
      <ConfirmDialog
        visible={sheet === "end"}
        title={`Encerrar vínculo com ${data.student.name}?`}
        message="O aluno perde o acesso aos planos e treinos. O histórico de treinos e feedbacks continua salvo."
        confirmLabel="Encerrar vínculo"
        loading={end.isPending}
        error={end.isError ? apiErrorMessage(end.error, "Não foi possível encerrar o vínculo. Tente novamente.") : undefined}
        onConfirm={() => end.mutateAsync().catch(() => {})}
        onCancel={() => {
          setSheet(null);
          end.reset();
        }}
      />
    </>
  );
}

function Identity({ data }: { data: StudentDetailOverview }) {
  return (
    <View style={styles.identity}>
      <Avatar name={data.student.name} size={64} />
      <View style={styles.identityCol}>
        <Text variant="headline" accessibilityRole="header">
          {data.student.name}
        </Text>
        <Text variant="caption" color="textSecondary" numberOfLines={1}>
          {data.student.email}
        </Text>
      </View>
      {data.activePlan === null ? <Badge label="Sem plano" /> : <Badge label="Plano ativo" tone="success" />}
    </View>
  );
}

function Stats({ data }: { data: StudentDetailOverview }) {
  const last = lastWorkoutStat(data.lastWorkoutAt);
  return (
    <View style={styles.grid}>
      <View style={styles.gridRow}>
        <StatCard
          compact
          label="Plano ativo"
          value={data.activePlan?.name ?? "Nenhum"}
          helper={data.activePlan === null ? "sem plano em vigor" : formatPlanRange(data.activePlan.startDate, data.activePlan.endDate)}
        />
        <StatCard compact label="Esta semana" value={`${data.thisWeek.completed} de ${data.thisWeek.total}`} helper="treinos concluídos" />
      </View>
      <View style={styles.gridRow}>
        <StatCard compact label="Último treino" value={last.value} helper={last.helper} />
        <StatCard
          compact
          label="Adesão"
          value={data.adherence4Weeks === null ? "—" : `${data.adherence4Weeks}%`}
          helper="últimas 4 semanas"
        />
      </View>
    </View>
  );
}

function ProgressTab({
  clientId,
  exerciseId,
  onExerciseChange: setExerciseId,
}: {
  clientId: number;
  exerciseId: string | null;
  onExerciseChange: (id: string) => void;
}) {
  // Still every exercise, walked page by page: this dropdown is out of lazy-exercise-search's
  // scope until it becomes a searchable picker (spec §6).
  const exercises = useQuery({ queryKey: allExercisesQueryKey, queryFn: ({ signal }) => fetchAllExercises({ signal }) });
  const progress = useQuery({
    queryKey: exerciseProgressQueryKey(Number(exerciseId), clientId),
    queryFn: () => fetchExerciseProgress(Number(exerciseId), clientId),
    enabled: exerciseId !== null,
  });
  return (
    <View style={styles.progress}>
      <SelectField
        label="Exercício"
        placeholder="Selecione um exercício"
        value={exerciseId}
        onChange={setExerciseId}
        options={(exercises.data ?? []).map((exercise) => ({ value: String(exercise.id), label: exercise.name }))}
        disabled={exercises.data === undefined}
      />
      {exerciseId === null ? (
        <EmptyState icon={ChartNoAxesColumn} title="Escolha um exercício" message="Veja a evolução da carga máxima por semana." />
      ) : progress.data === undefined ? (
        progress.isError ? (
          <ErrorState onRetry={() => void progress.refetch()} retrying={progress.isFetching} />
        ) : (
          <Skeleton.Block width="100%" height={sizes.chartAreaHeight} style={styles.chartSkeleton} />
        )
      ) : recentWeeks(progress.data).length === 0 ? (
        <EmptyState
          icon={ChartNoAxesColumn}
          title="Sem registros de carga"
          message="Quando o aluno concluir treinos com este exercício, a evolução aparece aqui."
        />
      ) : (
        <WeightChart points={progress.data} />
      )}
    </View>
  );
}

/** M - Detalhe do Aluno (Loading). */
function DetailSkeleton() {
  return (
    <View style={styles.skeleton} accessible accessibilityLabel="Carregando aluno">
      <View style={styles.identity}>
        <Skeleton.Circle size={64} />
        <View style={styles.identityCol}>
          <Skeleton.Line width="70%" height={sizes.skeletonTitleHeight} />
          <Skeleton.Line width="50%" />
        </View>
      </View>
      {[0, 1].map((row) => (
        <View key={row} style={styles.gridRow}>
          <Skeleton.Block width="48%" height={sizes.skeletonStatHeight} style={styles.chartSkeleton} />
          <Skeleton.Block width="48%" height={sizes.skeletonStatHeight} style={styles.chartSkeleton} />
        </View>
      ))}
      <Skeleton.Block width="100%" height={controls.height} style={styles.pill} />
      <ListSkeleton />
    </View>
  );
}

function ListSkeleton() {
  return (
    <View style={styles.list}>
      {[0, 1, 2].map((row) => (
        <Skeleton.Block key={row} width="100%" height={sizes.skeletonPlanCardHeight} style={styles.chartSkeleton} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  content: { paddingTop: space[2], gap: space[6] },
  identity: { flexDirection: "row", alignItems: "center", gap: space[4] },
  identityCol: { flex: 1, gap: sizes.identityLinesGap },
  grid: { gap: space[3] },
  gridRow: { flexDirection: "row", gap: space[3] },
  list: { gap: sizes.cardListGap },
  progress: { gap: space[4] },
  chartSkeleton: { borderRadius: radius.lg },
  pill: { borderRadius: radius.full },
  skeleton: { gap: space[6] },
  more: { paddingTop: space[3] },
});

/** A route like `/alunos/abc` can't name a student: back to the roster. */
function useInvalidIdRedirect(valid: boolean) {
  const toast = useToast();
  useEffect(() => {
    if (valid) return;
    router.replace("/alunos");
    toast.show("Aluno não encontrado.", "error");
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once
  }, [valid]);
}
