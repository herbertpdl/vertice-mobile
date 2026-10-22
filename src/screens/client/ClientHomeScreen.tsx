import { useQueries, useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import { CalendarX, CircleCheck, ClipboardList, ClipboardX, Coffee, Dumbbell, Timer } from "lucide-react-native";
import { useState } from "react";
import { StyleSheet, View } from "react-native";

import { ActivePlanCard, WorkoutPickerSheet, type ActivePlanCardProps } from "@/components/domain";
import { Screen } from "@/components/layout";
import { EmptyState, ErrorState, ListRow, SectionHeader, Skeleton, StatusBanner, Text, WeekStrip } from "@/components/ui";
import { fetchTrainingPlan, fetchTrainingPlans, myPlansQueryKey, trainingPlanQueryKey } from "@/lib/api/trainingPlans";
import type { FullWorkout, TrainingPlanDetail, Workout, WorkoutLog } from "@/lib/api/types";
import { fetchFullWorkout, fullWorkoutQueryKey } from "@/lib/api/workouts";
import { fetchWorkoutLogs, workoutLogsQueryKey } from "@/lib/api/workoutSessions";
import { useMe } from "@/lib/auth";
import { dayOfWeekOf, weekStartOf } from "@/lib/calendar";
import { clientWeek, finishedCount, homeAction, isFinished, type HomeAction } from "@/lib/clientWeek";
import { formatPlanRange, formatTimeOfDay, formatWeekdayDate, greetingFor, todayLocalIso } from "@/lib/format";
import { DAY_ABBR, DAY_NAMES } from "@/lib/labels";
import { useIsOffline } from "@/lib/network";
import { activePlan } from "@/lib/plans";
import { usePullToRefresh } from "@/lib/usePullToRefresh";
import { colors, radius, sizes, space } from "@/theme";

function plural(count: number, one: string, many: string): string {
  return `${count} ${count === 1 ? one : many}`;
}

/** "6 exercícios · 22 séries" for a workout tree, or "" while it loads. */
export function workoutSummary(full: FullWorkout | undefined): string {
  if (full === undefined) return "";
  const sets = full.exercises.reduce((total, exercise) => total + exercise.sets.length, 0);
  return `${plural(full.exercises.length, "exercício", "exercícios")} · ${plural(sets, "série", "séries")}`;
}

/** Where a workout is trained (PR 18 builds the session screen there). */
function openSession(workout: Pick<Workout, "id">) {
  router.push(`/aluno/treino/${workout.id}`);
}

type Picker = { workouts: Workout[]; notice?: string } | null;

/** The card's today block and button for each `HomeAction` (A - Início and its states). */
export function todayCard(
  action: HomeAction,
  ctx: {
    today: string;
    workouts: Workout[];
    logs: WorkoutLog[];
    fulls: ReadonlyMap<number, FullWorkout>;
    openPicker: (picker: NonNullable<Picker>) => void;
  },
): Pick<ActivePlanCardProps, "today" | "action"> {
  const weekday = dayOfWeekOf(ctx.today);
  switch (action.kind) {
    case "continue": {
      const workout = ctx.workouts.find((w) => w.id === action.log.workoutId);
      return {
        today: {
          tone: "warning",
          icon: Timer,
          eyebrow: `EM ANDAMENTO · INICIADO ÀS ${formatTimeOfDay(action.log.startedAt)}`,
          title: workout?.name ?? "Treino em andamento",
          detail: "Continue de onde parou.",
        },
        action: { label: "Continuar treino", onPress: () => openSession({ id: action.log.workoutId }) },
      };
    }
    case "start":
      return {
        today: {
          tone: "primary",
          icon: Dumbbell,
          eyebrow: `TREINO DE HOJE · ${DAY_ABBR[weekday]}`,
          title: action.workout.name,
          detail: workoutSummary(ctx.fulls.get(action.workout.id)),
        },
        action: { label: "Começar treino", onPress: () => openSession(action.workout) },
      };
    case "done": {
      const log = ctx.logs.find((l) => isFinished(l) && action.workouts.some((w) => w.id === l.workoutId));
      return {
        today: {
          tone: "success",
          icon: CircleCheck,
          eyebrow: log === undefined ? "CONCLUÍDO HOJE" : `CONCLUÍDO · ${formatTimeOfDay(log.completedAt)}`,
          title: action.workouts.map((w) => w.name).join(" · "),
          detail: "Bom trabalho! Se quiser, escolha outro treino.",
        },
        action: {
          label: "Treinar outro treino",
          variant: "secondary",
          onPress: () => ctx.openPicker({ workouts: ctx.workouts }),
        },
      };
    }
    case "pick":
      if (action.today.length > 1) {
        return {
          today: {
            tone: "primary",
            icon: Dumbbell,
            eyebrow: `TREINOS DE HOJE · ${DAY_ABBR[weekday]}`,
            title: `${action.today.length} treinos para hoje`,
            detail: "Escolha qual fazer.",
          },
          action: { label: "Começar treino", onPress: () => ctx.openPicker({ workouts: action.today }) },
        };
      }
      if (action.today.length === 1) {
        // Today's only workout has no exercises yet (R17): say so, and offer the others.
        return {
          today: {
            tone: "neutral",
            icon: ClipboardX,
            eyebrow: `TREINO DE HOJE · ${DAY_ABBR[weekday]}`,
            title: action.today[0].name,
            detail: "Sem exercícios ainda — escolha outro treino do plano.",
          },
          action: {
            label: "Começar treino",
            onPress: () =>
              ctx.openPicker({
                workouts: ctx.workouts,
                notice: "O treino de hoje ainda não tem exercícios. Escolha outro treino do plano.",
              }),
          },
        };
      }
      return {
        today: {
          tone: "neutral",
          icon: Coffee,
          eyebrow: `HOJE · ${DAY_ABBR[weekday]}`,
          title: "Sem treino programado hoje",
          detail: "Você pode escolher outro treino do plano.",
        },
        action: {
          label: "Começar treino",
          onPress: () =>
            ctx.openPicker({
              workouts: ctx.workouts,
              notice: `Hoje (${DAY_NAMES[weekday].toLowerCase()}) não tem treino no seu plano. Escolha qual quer fazer.`,
            }),
        },
      };
    case "empty":
      return {
        today: {
          tone: "neutral",
          icon: ClipboardX,
          eyebrow: "TREINOS",
          title: "Nenhum treino neste plano ainda",
          detail: "Seu treinador ainda não adicionou treinos. Volte mais tarde.",
        },
        action: { label: "Começar treino", disabled: true, onPress: () => {} },
      };
  }
}

/**
 * A - Início (client): the active plan and its one button, this week's strip and a way to the other
 * plans (PRD R1–R8, R13–R15). The plan's workout trees are read to count exercises and sets (the
 * plan detail carries no counts), at most seven small requests, cached.
 */
export function ClientHomeScreen() {
  const { data: me } = useMe();
  const offline = useIsOffline();
  const today = todayLocalIso();
  const weekStart = weekStartOf(today);
  const [picker, setPicker] = useState<Picker>(null);

  const plans = useQuery({ queryKey: myPlansQueryKey, queryFn: ({ signal }) => fetchTrainingPlans(undefined, { signal }) });
  const active = plans.data === undefined ? undefined : activePlan(plans.data, today);
  const plan = useQuery({
    queryKey: trainingPlanQueryKey(active?.id ?? 0),
    queryFn: ({ signal }) => fetchTrainingPlan(active!.id, { signal }),
    enabled: active !== undefined,
  });
  const logs = useQuery({
    queryKey: workoutLogsQueryKey(active?.id ?? 0, weekStart),
    queryFn: ({ signal }) => fetchWorkoutLogs(active!.id, weekStart, { signal }),
    enabled: active !== undefined,
  });
  const workouts = plan.data?.workouts ?? [];
  const fullQueries = useQueries({
    queries: workouts.map((w) => ({
      queryKey: fullWorkoutQueryKey(w.id),
      queryFn: ({ signal }: { signal: AbortSignal }) => fetchFullWorkout(w.id, { signal }),
    })),
  });
  const fulls = new Map<number, FullWorkout>();
  fullQueries.forEach((q) => {
    if (q.data !== undefined) fulls.set(q.data.id, q.data);
  });
  const counts = new Map([...fulls].map(([id, full]) => [id, full.exercises.length]));

  // Only the queries that can run: without an active plan, the plan and week queries are disabled
  // (a manual refetch would run them anyway, with no plan id).
  const refetchAll = () =>
    Promise.all([
      plans.refetch(),
      ...(active === undefined ? [] : [plan.refetch(), logs.refetch(), ...fullQueries.map((q) => q.refetch())]),
    ]);
  const pull = usePullToRefresh(refetchAll);
  const retry = { label: "Tentar", onPress: () => void refetchAll() };
  const failed = plans.isError || (active !== undefined && (plan.isError || logs.isError));
  const banner = offline ? (
    <StatusBanner kind="offline" action={retry} />
  ) : failed && plans.data !== undefined ? (
    <StatusBanner kind="error" action={retry} />
  ) : undefined;

  const firstName = me?.name.trim().split(/\s+/)[0] ?? "";
  const greeting = (
    <View style={styles.greeting}>
      <Text variant="title" accessibilityRole="header">
        {firstName === "" ? greetingFor() : `${greetingFor()}, ${firstName}`}
      </Text>
      <Text variant="body" color="textSecondary">
        {formatWeekdayDate(today)}
      </Text>
    </View>
  );

  let body: React.ReactNode;
  if (plans.data === undefined) {
    body = plans.isError ? <ErrorState onRetry={() => void plans.refetch()} retrying={plans.isFetching} /> : <HomeSkeleton />;
  } else if (active === undefined) {
    body = (
      <EmptyState
        icon={CalendarX}
        title="Nenhum plano em andamento"
        message="Seu treinador ainda não liberou um plano para este período. Você pode ver seus planos anteriores e os próximos."
        action={{ label: "Ver meus planos", onPress: () => router.navigate("/aluno/planos") }}
      />
    );
  } else if (plan.data === undefined || logs.data === undefined) {
    body =
      plan.isError || logs.isError ? (
        <ErrorState onRetry={() => void refetchAll()} retrying={plan.isFetching || logs.isFetching} />
      ) : (
        <HomeSkeleton />
      );
  } else {
    body = (
      <HomeContent
        plan={plan.data}
        logs={logs.data}
        today={today}
        weekStart={weekStart}
        fulls={fulls}
        counts={counts}
        openPicker={setPicker}
      />
    );
  }

  return (
    <>
      <Screen inTabs refreshing={pull.refreshing} onRefresh={pull.onRefresh} header={banner} contentStyle={styles.content}>
        {greeting}
        {body}
      </Screen>
      <WorkoutPickerSheet
        visible={picker !== null}
        onClose={() => setPicker(null)}
        workouts={picker?.workouts ?? []}
        exerciseCounts={counts}
        finished={new Set((logs.data ?? []).filter(isFinished).map((l) => l.workoutId))}
        today={dayOfWeekOf(today)}
        notice={picker?.notice}
        onPick={(workout) => {
          setPicker(null);
          openSession(workout);
        }}
      />
    </>
  );
}

function HomeContent({
  plan,
  logs,
  today,
  weekStart,
  fulls,
  counts,
  openPicker,
}: {
  plan: TrainingPlanDetail;
  logs: WorkoutLog[];
  today: string;
  weekStart: string;
  fulls: ReadonlyMap<number, FullWorkout>;
  counts: ReadonlyMap<number, number>;
  openPicker: (picker: NonNullable<Picker>) => void;
}) {
  const action = homeAction(plan.workouts, logs, today, counts);
  const card = todayCard(action, { today, workouts: plan.workouts, logs, fulls, openPicker });
  const week = clientWeek(plan.workouts, logs, weekStart, today);
  const total = plan.workouts.length;
  const done = finishedCount(plan.workouts, logs);
  return (
    <>
      <ActivePlanCard
        name={plan.name}
        level={plan.level}
        meta={`${formatPlanRange(plan.startDate, plan.endDate)} · ${plural(total, "treino por semana", "treinos por semana")}`}
        {...card}
      />
      <View style={styles.section}>
        <SectionHeader title="Esta semana" />
        <WeekStrip
          days={week.map((d) => ({
            label: DAY_ABBR[d.day],
            dayNumber: String(Number(d.date.slice(8))),
            name: DAY_NAMES[d.day],
            state: d.state,
          }))}
        />
        <Text variant="caption" color="textSecondary">
          {total === 0 ? "Nenhum treino programado esta semana" : `${done} de ${plural(total, "treino concluído", "treinos concluídos")}`}
        </Text>
      </View>
      <View style={styles.card}>
        <ListRow icon={ClipboardList} label="Ver outros planos" last onPress={() => router.navigate("/aluno/planos")} />
      </View>
    </>
  );
}

/** Placeholders while the plan, its workouts and the week load. */
function HomeSkeleton() {
  return (
    <View style={styles.skeleton} accessible accessibilityLabel="Carregando seu plano">
      <Skeleton.Block width="100%" height={sizes.skeletonHomeCardHeight} style={styles.rounded} />
      <Skeleton.Line width={sizes.skeletonSectionWidth} height={sizes.skeletonSectionHeight} />
      <Skeleton.Block width="100%" height={sizes.weekDayCircle + space[6]} style={styles.rounded} />
    </View>
  );
}

const styles = StyleSheet.create({
  content: { paddingTop: space[3], gap: space[6] },
  greeting: { gap: space[1] },
  section: { gap: space[3] },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
  },
  skeleton: { gap: space[6] },
  rounded: { borderRadius: radius.lg },
});
