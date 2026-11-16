import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import { router, useLocalSearchParams } from "expo-router";
import { useNavigation, usePreventRemove } from "expo-router/react-navigation";
import { ChartColumn, ChevronLeft, CircleCheck, CirclePlay, Ellipsis, List, Repeat, RotateCcw, Trash2 } from "lucide-react-native";
import { useEffect, useEffectEvent, useReducer, useRef, useState } from "react";
import { AppState, Platform, Pressable, StyleSheet, View } from "react-native";
import type { KeyboardAwareScrollViewRef } from "react-native-keyboard-controller";

import { ProgressSheet, StrategySheet, VideoSheet, WorkoutPickerSheet } from "@/components/domain";
import { NavBar, Screen } from "@/components/layout";
import {
  ActionSheet,
  Button,
  ConfirmDialog,
  ErrorState,
  ExerciseDoneCheck,
  ExerciseOverviewRow,
  RestTimer,
  Skeleton,
  StatusBanner,
  Text,
  useToast,
  WorkoutSetRow,
} from "@/components/ui";
import { ApiError } from "@/lib/api/client";
import { apiErrorMessage } from "@/lib/api/errorMessages";
import { fetchTrainingPlan, myPlansQueryKey, trainingPlanQueryKey } from "@/lib/api/trainingPlans";
import type { DayOfWeek, FullWorkout, Workout, WorkoutLog, WorkoutSession, WorkoutSessionSet } from "@/lib/api/types";
import { fetchFullWorkout, fullWorkoutQueryKey } from "@/lib/api/workouts";
import {
  fetchWorkoutLogs,
  fetchWorkoutSession,
  restartWorkoutSession,
  workoutLogsQueryKey,
  workoutLogsQueryPrefix,
  workoutSessionQueryKey,
} from "@/lib/api/workoutSessions";
import { useMe } from "@/lib/auth";
import { dayOfWeekOf, weekStartOf } from "@/lib/calendar";
import { todayLocalIso } from "@/lib/format";
import { DAY_ABBR } from "@/lib/labels";
import { useIsOffline } from "@/lib/network";
import { shouldRetry } from "@/lib/query-client";
import { youtubeVideoId } from "@/lib/video";
import { dismissRestNotifications, useRestAlert, useRestNotification } from "@/lib/workoutSession/alerts";
import { useRestCountdown } from "@/lib/workoutSession/restCountdown";
import {
  clearLocalSession,
  enqueue,
  readLocalSession,
  pendingOperations,
  saveLocalSession,
  sendNow,
  whenDrained,
  type LocalSession,
  type OutboxOp,
} from "@/lib/workoutSession/outbox";
import {
  clockText,
  currentExercise,
  currentSetId,
  initSession,
  inputToWeight,
  onLastOpenExercise,
  orderedExercises,
  overviewMain,
  overviewRows,
  pendingSets,
  secondsLeft,
  sessionReducer,
  stepRows,
  timerProgress,
  type OverviewRow,
  type SessionState,
} from "@/lib/workoutSession/engine";
import { exerciseSummary, isTimed, nextSetText, prescribedLoad, setGoal, strategyGuide, weightText } from "@/lib/workoutText";
import { colors, controls, disabledOpacity, radius, sizes, space, TINT_ALPHA, withAlpha } from "@/theme";

/** How often the timers redraw while one runs (time is read from the clock, never counted). */
const TICK_MS = 250;
/** How long the session waits to be kept on the device after a change. */
const PERSIST_DELAY_MS = 300;
/** Online, how long finishing waits for its answer (an automatic finish skips the feedback). */
const FINISH_WAIT_MS = 10_000;
/** Opening a session waits this long at most for the outbox to drain first. */
const OPEN_DRAIN_MS = 5_000;
/** How long a weight edit on a ticked set waits before it's re-recorded. */
const WEIGHT_SAVE_DELAY_MS = 800;
/** A rest seen ending later than this (the app was away) gets no in-app alert: the notification was it. */
const LIVE_END_MS = 2 * TICK_MS;

function plural(count: number, one: string, many: string) {
  return `${count} ${count === 1 ? one : many}`;
}

/** The second line of a set: last time's weight, else the trainer's load (a note is the strategy's). */
export function setHint(set: WorkoutSessionSet): string | undefined {
  if (set.lastPerformed !== null && set.lastPerformed.weight !== "") {
    return `Última vez: ${weightText(set.lastPerformed.weight.replace(/\.?0+$/, ""))} kg`;
  }
  const load = prescribedLoad(set);
  return load === "" ? undefined : load;
}

/**
 * Opens the week's session of a workout: what's still queued (a discard before a switch, the last
 * ticks) lands first. It starts a session when the week has none — never call it just to look.
 */
async function openWorkoutSession(workoutId: number, signal?: AbortSignal): Promise<WorkoutSession> {
  const drained = await whenDrained(OPEN_DRAIN_MS);
  // A finish or discard of this workout still waiting: the server's session is about to close, so
  // opening it now would queue new ticks behind it.
  const closing = pendingOperations().some(
    (op) => (op.kind === "complete" || op.kind === "discard") && op.workoutId === workoutId,
  );
  if (!drained && closing) throw new SyncPendingError();
  return fetchWorkoutSession(workoutId, { signal });
}

/** This device's session of the workout, when it can still be resumed. */
function resumableLocalSession(workoutId: number): LocalSession | null {
  const stored = readLocalSession();
  if (stored?.workoutId !== workoutId) return null;
  // Finished or discarded already, the answer still queued (the app closed while waiting): the
  // session is closing, and it's never resumed.
  const closing = pendingOperations().some(
    (op) => (op.kind === "complete" || op.kind === "discard") && op.logId === stored.logId,
  );
  if (closing) {
    clearLocalSession(stored.logId);
    return null;
  }
  // An earlier week's session was closed by the rollover: never resumed (its writes would all be
  // refused).
  if (stored.state.snapshot.workoutLog.weekStartDate !== weekStartOf(todayLocalIso())) {
    clearLocalSession(stored.logId);
    return null;
  }
  return stored;
}

const OPEN_OFFLINE = "Sem conexão. Conecte-se à internet para abrir este treino.";
const SYNC_PENDING = "O treino que você finalizou ainda está sendo enviado. Tente de novo em instantes.";

/**
 * A - Visão geral do treino, then A - Treino (workout overview PRD R1–R28, client workout PRD
 * R29–R54). Every way into a workout lands on its overview. Before a session exists the overview is
 * drawn from the workout tree and the week's logs, never from `GET …/session`, which would start
 * one (R4); opening an exercise starts it (R5), and a workout finished this week asks to be redone
 * first (R22). With a session the overview and the exercise are two views of `SessionView`.
 */
export function WorkoutSessionScreen() {
  const params = useLocalSearchParams<{ workoutId: string }>();
  const workoutId = Number(params.workoutId);
  const queryClient = useQueryClient();
  const toast = useToast();
  const offline = useIsOffline();
  const today = todayLocalIso();
  const [local] = useState(() => resumableLocalSession(workoutId));
  /** A session opened from the overview, at the exercise picked. */
  const [opened, setOpened] = useState<{ snapshot: WorkoutSession; index: number } | null>(null);
  /** The exercise picked on a workout finished this week, waiting on the redo dialog (R22). */
  const [redoAt, setRedoAt] = useState<number | null>(null);
  const [menu, setMenu] = useState<"actions" | "picker" | null>(null);

  const tree = useQuery({
    queryKey: fullWorkoutQueryKey(workoutId),
    queryFn: ({ signal }) => fetchFullWorkout(workoutId, { signal }),
  });
  const planId = tree.data?.trainingPlanId;
  const logs = useQuery({
    queryKey: workoutLogsQueryKey(planId ?? 0, weekStartOf(today)),
    queryFn: ({ signal }) => fetchWorkoutLogs(planId!, weekStartOf(today), { signal }),
    enabled: planId !== undefined,
    // Início's copy can be from before a session started or finished elsewhere.
    refetchOnMount: "always",
  });
  const fresh = logs.isFetchedAfterMount ? logs.data : undefined;
  // A refusal of the workout (a 4xx: it or the trainer is gone), not a missing answer.
  const refused = tree.error instanceof ApiError && tree.error.status >= 400 && tree.error.status < 500;
  // The kept session was finished or discarded elsewhere when the server's week no longer has it in
  // progress, or its workout is refused. Only an answer says so; without one (offline) it goes on.
  const localClosed =
    local !== null && (refused || (fresh !== undefined && !fresh.some((l) => l.id === local.logId && l.status === "IN_PROGRESS")));
  useEffect(() => {
    if (localClosed) clearLocalSession(local.logId);
  }, [localClosed, local]);

  const mine = (logs.data ?? []).filter((l) => l.workoutId === workoutId);
  const inProgress = mine.some((l) => l.status === "IN_PROGRESS");
  // In progress on the server and not on this device: `GET …/session` resumes it (it starts nothing
  // then), but only on a fresh answer — a stale one could have it discarded meanwhile.
  const resuming = opened === null && (local === null || localClosed) && inProgress && fresh !== undefined;
  const resumed = useQuery({
    queryKey: workoutSessionQueryKey(workoutId),
    queryFn: ({ signal }) => openWorkoutSession(workoutId, signal),
    enabled: resuming,
    retry: (count, error) => !(error instanceof SyncPendingError) && shouldRetry(count, error),
    // One snapshot per opening (R29): never refetched under the client, dropped when they leave.
    staleTime: Infinity,
    gcTime: 0,
  });

  const start = useMutation({
    mutationFn: async (index: number) => ({ index, session: await openWorkoutSession(workoutId) }),
    onSuccess: ({ index, session }) => {
      void queryClient.invalidateQueries({ queryKey: workoutLogsQueryPrefix });
      // Finished this week after all (the logs were behind): it's a redo (R22).
      if (session.workoutLog.status === "IN_PROGRESS") setOpened({ snapshot: session, index });
      else setRedoAt(index);
    },
    onError: (error) =>
      toast.show(
        error instanceof SyncPendingError ? SYNC_PENDING : apiErrorMessage(error, "Não foi possível abrir o treino. Tente novamente."),
        "error",
      ),
  });
  const restart = useMutation({
    mutationFn: () => restartWorkoutSession(workoutId),
    onSuccess: (started) => {
      void queryClient.invalidateQueries({ queryKey: workoutLogsQueryPrefix });
      setOpened({ snapshot: started, index: redoAt ?? 0 });
      setRedoAt(null);
    },
  });
  const plan = useQuery({
    queryKey: trainingPlanQueryKey(planId ?? 0),
    queryFn: ({ signal }) => fetchTrainingPlan(planId!, { signal }),
    enabled: menu === "picker" && planId !== undefined,
  });

  if (opened !== null) {
    return <SessionView key={opened.snapshot.workoutLog.id} snapshot={opened.snapshot} initialIndex={opened.index} initialView="exercise" />;
  }
  if (local !== null && !localClosed) {
    return <SessionView key={local.logId} snapshot={local.state.snapshot} restored={local} initialView="overview" />;
  }
  if (resumed.data?.workoutLog.status === "IN_PROGRESS") {
    return <SessionView key={resumed.data.workoutLog.id} snapshot={resumed.data} initialView="overview" />;
  }

  const back = () => (router.canGoBack() ? router.back() : router.replace("/aluno"));
  const header = <NavBar title="Visão geral" onBack={back} />;
  const waiting = tree.data === undefined || logs.data === undefined || (resuming && resumed.data === undefined);
  if (waiting) {
    const failed = tree.isError || logs.isError || resumed.isError;
    const paused = tree.fetchStatus === "paused" || logs.fetchStatus === "paused" || resumed.fetchStatus === "paused";
    const retry = () => void Promise.all([tree.refetch(), planId === undefined ? null : logs.refetch(), resuming ? resumed.refetch() : null]);
    return (
      <Screen header={header}>
        {resumed.error instanceof SyncPendingError ? (
          <ErrorState title="Enviando seu último treino" message={SYNC_PENDING} onRetry={retry} retrying={resumed.isFetching} />
        ) : paused ? (
          // A workout never opened on this device needs the connection once (R55, E28).
          <ErrorState
            title="Sem conexão"
            message="Conecte-se à internet para abrir este treino. Depois de aberto, ele funciona sem conexão."
            onRetry={retry}
          />
        ) : failed ? (
          <ErrorState onRetry={retry} retrying={tree.isFetching || logs.isFetching || resumed.isFetching} />
        ) : (
          <OverviewSkeleton />
        )}
      </Screen>
    );
  }

  const workout = tree.data;
  const finished = !inProgress && mine.some((l) => l.status === "COMPLETED");
  const open = (index: number) => {
    if (finished) return setRedoAt(index);
    if (offline) return toast.show(OPEN_OFFLINE, "error");
    if (!start.isPending) start.mutate(index);
  };
  const counts = new Map(
    (plan.data?.workouts ?? []).flatMap((w) => {
      const full = queryClient.getQueryData<FullWorkout>(fullWorkoutQueryKey(w.id));
      return full === undefined ? [] : [[w.id, full.exercises.length] as const];
    }),
  );
  return (
    <>
      <WorkoutOverview
        name={workout.name}
        dayOfWeek={workout.dayOfWeek}
        summary={workoutCounts(workout.exercises)}
        hint="Toque em um exercício para começar por ele."
        finished={finished}
        rows={overviewRows(workout.exercises)}
        onOpen={open}
        main={{
          label: finished ? "Refazer treino" : "Começar treino",
          loading: start.isPending,
          disabled: workout.exercises.length === 0,
          onPress: () => open(0),
        }}
        onBack={back}
        onActions={() => setMenu("actions")}
        banner={offline ? <StatusBanner kind="offline" /> : undefined}
      />
      <ActionSheet
        visible={menu === "actions"}
        onClose={() => setMenu(null)}
        title={workout.name}
        // Nothing to discard before a session: switching just opens the other workout's overview.
        actions={[{ icon: Repeat, label: "Trocar treino", onPress: () => setMenu("picker") }]}
      />
      <WorkoutPickerSheet
        visible={menu === "picker"}
        onClose={() => setMenu(null)}
        workouts={(plan.data?.workouts ?? []).filter((w) => w.id !== workoutId)}
        exerciseCounts={counts}
        finished={new Set((logs.data ?? []).filter((l) => l.status === "COMPLETED").map((l) => l.workoutId))}
        today={dayOfWeekOf(today)}
        onPick={(picked) => {
          setMenu(null);
          router.replace(`/aluno/treino/${picked.id}`);
        }}
      />
      <RedoDialog
        visible={redoAt !== null}
        name={workout.name}
        loading={restart.isPending}
        error={restart.isError ? apiErrorMessage(restart.error, "Não foi possível começar de novo. Tente novamente.") : undefined}
        onConfirm={() => restart.mutateAsync().catch(() => {})}
        // Cancel stays on the overview, the finished session untouched (E5).
        onCancel={() => {
          setRedoAt(null);
          restart.reset();
        }}
      />
    </>
  );
}

/** The warning before redoing a workout finished this week (client workout PRD R20–R23). */
function RedoDialog(props: { visible: boolean; name: string; loading: boolean; error?: string; onConfirm: () => void; onCancel: () => void }) {
  return (
    <ConfirmDialog
      visible={props.visible}
      icon={RotateCcw}
      tone="info"
      confirmVariant="primary"
      title="Refazer este treino?"
      message={`Você já concluiu o “${props.name}” nesta semana. Ao finalizar o novo, ele substitui o anterior (cargas e feedback). Se você descartar, o anterior continua valendo.`}
      confirmLabel="Refazer treino"
      loading={props.loading}
      error={props.error}
      onConfirm={props.onConfirm}
      onCancel={props.onCancel}
    />
  );
}

/** "6 exercícios · 22 séries". */
function workoutCounts(exercises: readonly { sets: readonly unknown[] }[]): string {
  const sets = exercises.reduce((total, e) => total + e.sets.length, 0);
  return `${plural(exercises.length, "exercício", "exercícios")} · ${plural(sets, "série", "séries")}`;
}

type OverviewProps = {
  name: string;
  dayOfWeek: DayOfWeek;
  summary: string;
  hint: string;
  /** Finished this week: the note, no progress (R19, R20). */
  finished?: boolean;
  rows: OverviewRow[];
  onOpen: (index: number) => void;
  main: { label: string; onPress: () => void; loading?: boolean; disabled?: boolean };
  onBack: () => void;
  onActions: () => void;
  banner?: React.ReactNode;
};

/** A - Visão geral do treino and its states (frames `dri2T`, `eJXmb`, `XnXD9`, `RYbCh`). */
function WorkoutOverview({ name, dayOfWeek, summary, hint, finished = false, rows, onOpen, main, onBack, onActions, banner }: OverviewProps) {
  const day = DAY_ABBR[dayOfWeek];
  return (
    <Screen
      header={
        <>
          <NavBar title="Visão geral" onBack={onBack} action={{ icon: Ellipsis, accessibilityLabel: "Ações do treino", onPress: onActions }} />
          {banner}
        </>
      }
      contentStyle={styles.overview}
      footer={<Button label={main.label} loading={main.loading} disabled={main.disabled} onPress={main.onPress} />}
    >
      <View style={styles.hero}>
        <Text variant="eyebrow" color="primary">
          {dayOfWeek === dayOfWeekOf(todayLocalIso()) ? `TREINO DE HOJE · ${day}` : `TREINO DE ${day}`}
        </Text>
        <Text variant="title" accessibilityRole="header">
          {name}
        </Text>
        <Text variant="body" color="textSecondary">
          {summary}
        </Text>
      </View>
      {finished ? (
        <View style={styles.doneNote}>
          <CircleCheck size={16} color={colors.success} />
          <Text variant="label" color="success">
            Concluído esta semana
          </Text>
        </View>
      ) : null}
      {rows.length === 0 ? (
        <Text variant="body" color="textSecondary">
          Este treino ainda não tem exercícios.
        </Text>
      ) : (
        <>
          <Text variant="caption" color="textTertiary">
            {hint}
          </Text>
          <View style={styles.rows}>
            {rows.map((row) => (
              <ExerciseOverviewRow
                key={row.index}
                position={row.index + 1}
                name={row.name}
                setsText={row.setsText}
                thumbnail={row.thumbnail}
                hasVideo={row.hasVideo}
                muscleGroups={row.muscleGroups}
                progress={finished ? undefined : row.progress}
                onPress={() => onOpen(row.index)}
              />
            ))}
          </View>
        </>
      )}
    </Screen>
  );
}

function OverviewSkeleton() {
  return (
    <View style={styles.skeleton} accessible accessibilityLabel="Abrindo o treino">
      <Skeleton.Line width="70%" height={sizes.skeletonTitleHeight} />
      {[0, 1, 2, 3].map((i) => (
        <Skeleton.Block key={i} width="100%" height={sizes.workoutSetHeight} style={styles.rounded} />
      ))}
    </View>
  );
}

type Overlay = "actions" | "video" | "progress" | "picker" | "strategy" | "finish" | "discard" | "switch" | null;

type SessionViewProps = {
  snapshot: WorkoutSession;
  restored?: LocalSession;
  /** The exercise picked on the overview when the session opened from it. */
  initialIndex?: number;
  initialView: "overview" | "exercise";
};

function SessionView({ snapshot, restored, initialIndex, initialView }: SessionViewProps) {
  const queryClient = useQueryClient();
  const navigation = useNavigation();
  const toast = useToast();
  const offline = useIsOffline();
  const { data: me } = useMe();
  const [state, dispatch] = useReducer(sessionReducer, snapshot, (s) => restored?.state ?? initSession(s, initialIndex));
  const [view, setView] = useState(initialView);
  const [now, setNow] = useState(() => Date.now());
  const [overlay, setOverlay] = useState<Overlay>(null);
  const [switchTo, setSwitchTo] = useState<Workout | null>(null);
  /** The set whose strategy sheet is open (kept while it animates out). */
  const [strategySet, setStrategySet] = useState<WorkoutSessionSet | null>(null);
  /** Counts the exercises done since the check last showed; each one replays it. */
  const [doneCheck, setDoneCheck] = useState<{ key: number; announcement: string } | null>(null);
  const doneChecks = useRef(0);
  const alert = useRestAlert();
  const logId = snapshot.workoutLog.id;
  const exercises = orderedExercises(snapshot);
  const exercise = currentExercise(state);
  const current = currentSetId(state);

  // Each exercise opens at its top, however far down the last one's sets were.
  const scroll = useRef<KeyboardAwareScrollViewRef>(null);
  useEffect(() => {
    scroll.current?.scrollTo({ y: 0, animated: false });
  }, [state.exerciseIndex]);

  // ---- timers -----------------------------------------------------------------------------------
  const running = state.rest !== null || state.hold !== null;
  /** What was last sent per set, so a weight edit on a ticked set is re-recorded once. */
  const sent = useRef<Record<number, string>>(
    restored?.sent ??
      Object.fromEntries(
        snapshot.exercises.flatMap((e) => e.sets).flatMap((set) => (set.current === null ? [] : [[set.id, set.current.weight]])),
      ),
  );

  /** Ticks a set and records it; false (with a toast) when its weight isn't valid. */
  const tickSet = (setId: number, at: number): boolean => {
    const set = exercises.flatMap((e) => e.sets).find((s) => s.id === setId);
    if (set === undefined) return false;
    const weight = inputToWeight(state.weights[setId] ?? "");
    if (weight === null) {
      toast.show("Carga inválida: use até 999 kg, com até 2 casas decimais.", "error");
      return false;
    }
    dispatch({ type: "tick", setId, now: at });
    setNow(at);
    const after = sessionReducer(state, { type: "tick", setId, now: at });
    const owner = exercises.find((e) => e.sets.some((s) => s.id === setId));
    if (owner?.sets.every((s) => after.ticked[s.id])) {
      doneChecks.current += 1;
      const next = after.exerciseIndex === state.exerciseIndex ? undefined : currentExercise(after);
      setDoneCheck({
        key: doneChecks.current,
        announcement: next === undefined ? "Exercício concluído." : `Exercício concluído. Próximo: ${next.exercise.name}.`,
      });
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    sent.current = { ...sent.current, [setId]: weight };
    save({ kind: "recordSet", logId, exerciseSetId: setId, weight, reps: set.reps });
    return true;
  };

  const alertedEnd = useRef<number | null>(null);

  /** Each clock tick: redraw, and end the hold (ticking its set) or the rest (alerting) when due. */
  const onClock = useEffectEvent((at: number) => {
    setNow(at);
    if (state.hold !== null && at >= state.hold.endsAt) {
      // A hold can end behind a sheet about this exercise: if it moves on, the sheet would change under them.
      const moves = sessionReducer(state, { type: "tick", setId: state.hold.setId, now: at }).exerciseIndex !== state.exerciseIndex;
      if (!tickSet(state.hold.setId, at)) dispatch({ type: "stopHold" });
      else if (moves && (overlay === "video" || overlay === "progress" || overlay === "strategy")) setOverlay(null);
    } else if (state.rest !== null && at >= state.rest.endsAt) {
      // JS timers stop in the background: an end first seen on return already had its notification.
      // Once per rest, even if another tick lands before the end is rendered.
      // "inactive" (Control Center, Notification Center) is still the foreground: timers run and the
      // notification stays hidden, so the in-app alert is the one alert.
      const live = AppState.currentState !== "background" && at - state.rest.endsAt < LIVE_END_MS;
      if (live && alertedEnd.current !== state.rest.endsAt) alert();
      alertedEnd.current = state.rest.endsAt;
      dispatch({ type: "restEnded" });
    }
  });
  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => onClock(Date.now()), TICK_MS);
    return () => clearInterval(id);
  }, [running]);

  /** Back from the background: a rest that ended meanwhile ends silently, its notification cleared. */
  const onForeground = useEffectEvent(() => {
    dismissRestNotifications();
    if (state.rest !== null && Date.now() >= state.rest.endsAt) dispatch({ type: "restEnded" });
  });
  useEffect(() => {
    const subscription = AppState.addEventListener("change", (next) => {
      if (next === "active") onForeground();
    });
    return () => subscription.remove();
  }, []);

  const nextSet = current === undefined ? undefined : exercise?.sets.find((s) => s.id === current);
  useRestNotification(
    state.rest,
    nextSet === undefined || exercise === undefined
      ? { title: "Descanso terminou", body: "Hora da próxima série." }
      : { title: "Descanso terminou", body: `Hora da série ${nextSet.setNumber} de ${exercise.exercise.name}.` },
    () => Date.now(),
  );

  useRestCountdown(state.rest, nextSet === undefined ? "Descanso" : nextSetText(nextSet), () => Date.now());

  // ---- saving -----------------------------------------------------------------------------------

  /** Set once the session is finished or discarded: nothing is sent or kept for it after that. */
  const ended = useRef(false);

  // Back from an exercise — the swipe, Android's back button — returns to the overview (R24);
  // finishing, discarding and switching leave the route.
  usePreventRemove(view === "exercise", ({ data }) => {
    const goingBack = data.action.type === "GO_BACK" || data.action.type === "POP";
    if (goingBack && !ended.current) setView("overview");
    else navigation.dispatch(data.action);
  });
  /** Opens an exercise from the overview (R14); the one already open keeps its rest. */
  const openExercise = (index: number) => {
    if (index !== state.exerciseIndex) dispatch({ type: "goTo", index });
    setView("exercise");
  };

  /**
   * Every write goes through the outbox (§3.4): sent in order, kept across a closed app and a lost
   * connection, retried until it lands. Only a write the API refuses for good (a set the trainer
   * deleted meanwhile) is dropped, with a toast.
   */
  function save(op: OutboxOp) {
    enqueue(op).catch((error: unknown) => {
      if (error instanceof ApiError && error.status !== 0) {
        toast.show(apiErrorMessage(error, "Uma série não pôde ser salva."), "error");
      }
    });
  }

  // The session is kept on the device as it changes, and at once when the app leaves the
  // foreground (the system may close it there).
  const persist = () => {
    if (!ended.current) saveLocalSession({ workoutId: snapshot.id, logId, state, sent: sent.current });
  };
  const onStateSettled = useEffectEvent(persist);
  useEffect(() => {
    const timer = setTimeout(onStateSettled, PERSIST_DELAY_MS);
    return () => clearTimeout(timer);
  }, [state]);
  const onBackground = useEffectEvent(persist);
  useEffect(() => {
    const subscription = AppState.addEventListener("change", (next) => {
      if (next !== "active") onBackground();
    });
    return () => subscription.remove();
  }, []);

  /** Re-records the weights edited on ticked sets since they were last sent. */
  const flushWeights = () => {
    if (ended.current) return;
    for (const [id, text] of Object.entries(state.weights)) {
      const setId = Number(id);
      const weight = inputToWeight(text);
      if (!state.ticked[setId] || weight === null || sent.current[setId] === weight) continue;
      const set = exercises.flatMap((e) => e.sets).find((s) => s.id === setId);
      if (set === undefined) continue;
      sent.current = { ...sent.current, [setId]: weight };
      save({ kind: "recordSet", logId, exerciseSetId: setId, weight, reps: set.reps });
    }
  };
  const onWeightsSettled = useEffectEvent(flushWeights);
  useEffect(() => {
    const timer = setTimeout(onWeightsSettled, WEIGHT_SAVE_DELAY_MS);
    return () => clearTimeout(timer);
  }, [state.weights]);
  // Leaving by any way (back, the swipe, the system) sends an edit still waiting out the delay, and
  // keeps the session as it is.
  const onLeave = useEffectEvent(() => {
    flushWeights();
    persist();
  });
  useEffect(() => () => onLeave(), []);

  const untick = (setId: number) => {
    dispatch({ type: "untick", setId });
    const { [setId]: _dropped, ...kept } = sent.current;
    sent.current = kept;
    save({ kind: "deleteSet", logId, exerciseSetId: setId });
  };

  // ---- finishing, discarding, switching -----------------------------------------------------------
  const leave = (message?: string) => {
    void queryClient.invalidateQueries({ queryKey: workoutLogsQueryPrefix });
    void queryClient.invalidateQueries({ queryKey: myPlansQueryKey });
    router.replace("/aluno");
    if (message !== undefined) toast.show(message);
  };
  const finish = useMutation({
    mutationFn: async (): Promise<WorkoutLog | null> => {
      // Queued after the last tick's (or edit's) write: the outbox keeps the order (a finished
      // session takes no more sets).
      flushWeights();
      // Offline it's sent later (R56): the feedback step comes now either way.
      return sendNow<WorkoutLog>({ kind: "complete", logId, workoutId: snapshot.id }, FINISH_WAIT_MS);
    },
    onError: (error) => {
      // With sets left the dialog shows the error; finishing with all ticked has no dialog.
      if (overlay !== "finish") toast.show(finishErrorMessage(error), "error");
    },
    onSuccess: (log) => {
      ended.current = true;
      clearLocalSession(logId);
      setOverlay(null);
      void queryClient.invalidateQueries({ queryKey: workoutLogsQueryPrefix });
      // A session the weekly rollover already finished takes no feedback (R27).
      if (log?.completionKind === "AUTO") return leave("Treino finalizado.");
      const done = Object.keys(state.ticked).length;
      router.replace({
        pathname: "/aluno/treino/feedback/[logId]",
        params: { logId: String(logId), name: snapshot.name, summary: `${done} de ${plural(totalOf(state), "série", "séries")}` },
      });
    },
  });
  const discard = useMutation({
    // Queued like every write; a switch's next session is opened after it's sent (`whenDrained`).
    mutationFn: async () => void enqueue({ kind: "discard", logId, workoutId: snapshot.id }),
    onSuccess: () => {
      ended.current = true;
      clearLocalSession(logId);
      setOverlay(null);
      if (switchTo !== null) {
        void queryClient.invalidateQueries({ queryKey: workoutLogsQueryPrefix });
        router.replace(`/aluno/treino/${switchTo.id}`);
      } else leave("Treino descartado.");
    },
  });

  const plan = useQuery({
    queryKey: trainingPlanQueryKey(snapshot.trainingPlanId),
    queryFn: ({ signal }) => fetchTrainingPlan(snapshot.trainingPlanId, { signal }),
    enabled: overlay === "picker",
  });
  const counts = new Map(
    (plan.data?.workouts ?? []).flatMap((w) => {
      const full = queryClient.getQueryData<FullWorkout>(fullWorkoutQueryKey(w.id));
      return full === undefined ? [] : [[w.id, full.exercises.length] as const];
    }),
  );

  const requestFinish = () => (pendingSets(state) > 0 ? setOverlay("finish") : void finish.mutateAsync().catch(() => {}));

  /**
   * Closes a sheet and then opens what it led to — on iOS once the sheet has finished dismissing,
   * since UIKit won't present the dialog while the sheet's modal is animating out (`ActionSheet`).
   */
  const afterSheet = useRef<(() => void) | null>(null);
  const closeSheetThen = (run: () => void) => {
    setOverlay(null);
    if (Platform.OS === "ios") afterSheet.current = run;
    else run();
  };
  const onSheetDismissed = () => {
    const run = afterSheet.current;
    afterSheet.current = null;
    run?.();
  };

  // ---- render -----------------------------------------------------------------------------------
  const index = state.exerciseIndex;
  const last = onLastOpenExercise(state);
  const video = exercise === undefined || youtubeVideoId(exercise.exercise.videoUrl) === null ? null : exercise.exercise.videoUrl;
  const restCaption = nextSet === undefined ? "Exercício concluído" : nextSetText(nextSet);
  const restTimer = (flat: boolean) =>
    state.rest === null ? null : (
      <RestTimer
        flat={flat}
        remaining={clockText(secondsLeft(state.rest, now))}
        progress={timerProgress(state.rest, now)}
        span={state.rest}
        caption={flat ? "Continua contando" : restCaption}
      />
    );
  const overlays = (
    <>
      {doneCheck === null ? null : (
        <ExerciseDoneCheck key={doneCheck.key} announcement={doneCheck.announcement} onDone={() => setDoneCheck(null)} />
      )}
      <ActionSheet
        visible={overlay === "actions"}
        onClose={() => setOverlay(null)}
        title={snapshot.name}
        actions={[
          { icon: Repeat, label: "Trocar treino", onPress: () => setOverlay("picker") },
          { icon: Trash2, label: "Descartar treino", danger: true, onPress: () => setOverlay("discard") },
        ]}
      />
      {exercise === undefined ? null : (
        <>
          {video === null ? null : (
            <VideoSheet
              visible={overlay === "video"}
              onClose={() => setOverlay(null)}
              title={exercise.exercise.name}
              videoUrl={video}
              description={exercise.exercise.description}
              footer={restTimer(true) ?? undefined}
            />
          )}
          {me === undefined ? null : (
            <ProgressSheet
              visible={overlay === "progress"}
              onClose={() => setOverlay(null)}
              exerciseId={exercise.exerciseId}
              exerciseName={exercise.exercise.name}
              clientId={me.id}
            />
          )}
        </>
      )}
      <StrategySheet
        visible={overlay === "strategy"}
        onClose={() => setOverlay(null)}
        setNumber={strategySet?.setNumber ?? 0}
        guide={strategySet === null ? null : strategyGuide(strategySet)}
      />
      <WorkoutPickerSheet
        visible={overlay === "picker"}
        onClose={() => setOverlay(null)}
        workouts={(plan.data?.workouts ?? []).filter((w) => w.id !== snapshot.id)}
        exerciseCounts={counts}
        finished={new Set()}
        today={dayOfWeekOf(todayLocalIso())}
        onPick={(workout) => {
          setSwitchTo(workout);
          closeSheetThen(() => setOverlay("switch"));
        }}
        onDismiss={onSheetDismissed}
      />
      <ConfirmDialog
        visible={overlay === "finish"}
        icon={ChartColumn}
        tone="warning"
        confirmVariant="primary"
        title="Finalizar treino?"
        message={`Você ainda tem ${plural(pendingSets(state), "série não concluída", "séries não concluídas")}. Elas não serão registradas, e o treino conta como feito nesta semana.`}
        confirmLabel="Finalizar mesmo assim"
        loading={finish.isPending}
        error={finish.isError ? finishErrorMessage(finish.error) : undefined}
        onConfirm={() => finish.mutateAsync().catch(() => {})}
        onCancel={() => {
          setOverlay(null);
          finish.reset();
        }}
      />
      <ConfirmDialog
        visible={overlay === "discard"}
        title="Descartar treino?"
        message={`As séries marcadas e as cargas registradas neste treino serão apagadas. Essa ação não pode ser desfeita.`}
        confirmLabel="Descartar treino"
        loading={discard.isPending}
        error={discard.isError ? apiErrorMessage(discard.error, "Não foi possível descartar. Tente novamente.") : undefined}
        onConfirm={() => discard.mutateAsync().catch(() => {})}
        onCancel={() => {
          setOverlay(null);
          discard.reset();
        }}
      />
      <ConfirmDialog
        visible={overlay === "switch"}
        icon={Repeat}
        tone="warning"
        title="Trocar de treino?"
        message={`O progresso do “${snapshot.name}” será descartado e o “${switchTo?.name ?? ""}” começa do zero.`}
        confirmLabel="Descartar e trocar"
        loading={discard.isPending}
        error={discard.isError ? apiErrorMessage(discard.error, "Não foi possível trocar. Tente novamente.") : undefined}
        onConfirm={() => discard.mutateAsync().catch(() => {})}
        onCancel={() => {
          setOverlay(null);
          setSwitchTo(null);
          discard.reset();
        }}
      />
    </>
  );
  const offlineBanner = offline ? <StatusBanner kind="offline" message="Sem conexão. Seu treino será enviado quando a conexão voltar." /> : null;

  if (view === "overview" || exercise === undefined) {
    const main = overviewMain(state);
    const total = totalOf(state);
    return (
      <>
        <WorkoutOverview
          name={snapshot.name}
          dayOfWeek={snapshot.dayOfWeek}
          summary={`${Object.keys(state.ticked).length} de ${plural(total, "série feita", "séries feitas")}`}
          hint="Toque em um exercício para ir até ele."
          rows={overviewRows(snapshot.exercises, { ticked: state.ticked, exerciseIndex: state.exerciseIndex })}
          onOpen={openExercise}
          main={
            main.kind === "continue"
              ? { label: "Continuar treino", onPress: () => openExercise(main.index) }
              : { label: "Finalizar treino", loading: finish.isPending, onPress: requestFinish }
          }
          // Leaving keeps the session in progress (R6, R7).
          onBack={() => (router.canGoBack() ? router.back() : router.replace("/aluno"))}
          onActions={() => setOverlay("actions")}
          banner={offlineBanner}
        />
        {overlays}
      </>
    );
  }
  return (
    <>
      <Screen
        scrollRef={scroll}
        header={
          <>
            <NavBar
              title={snapshot.name}
              onBack={() => setView("overview")}
              action={{ icon: Ellipsis, accessibilityLabel: "Ações do treino", onPress: () => setOverlay("actions") }}
            />
            {offlineBanner}
          </>
        }
        contentStyle={styles.content}
        footer={
          <View style={styles.footer}>
            {restTimer(false)}
            <View style={styles.buttons}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Exercício anterior"
                accessibilityState={{ disabled: index === 0 }}
                disabled={index === 0}
                onPress={() => dispatch({ type: "goTo", index: index - 1 })}
                style={({ pressed }) => [styles.prev, index === 0 ? styles.prevDisabled : null, pressed ? styles.pressed : null]}
              >
                <ChevronLeft size={22} color={colors.textPrimary} />
              </Pressable>
              <Button
                label={last ? "Finalizar treino" : "Próximo exercício"}
                style={styles.flex}
                loading={finish.isPending}
                onPress={last ? requestFinish : () => dispatch({ type: "next" })}
              />
            </View>
          </View>
        }
      >
        <View style={styles.progress}>
          <View style={styles.segments} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
            {stepRows(state).map((step) => (
              <View
                key={step.index}
                style={[
                  styles.segment,
                  { backgroundColor: step.state === "done" ? colors.success : step.index === index ? colors.primary : colors.surfaceActive },
                ]}
              />
            ))}
          </View>
          <View style={styles.progressRow}>
            <Text variant="overline" color="textSecondary">
              {`EXERCÍCIO ${index + 1} DE ${exercises.length}`}
            </Text>
            <Pressable accessibilityRole="button" onPress={() => setView("overview")} style={styles.seeAll} hitSlop={controls.hitTarget / 4}>
              <List size={16} color={colors.primary} />
              <Text variant="bodyStrong" color="primary">
                Ver todos
              </Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.head}>
          <Text variant="title" accessibilityRole="header">
            {exercise.exercise.name}
          </Text>
          <Text variant="label" color="primary">
            {exerciseSummary(exercise)}
          </Text>
          {[exercise.exercise.description, exercise.notes].filter((t) => t.trim() !== "").map((text, i) => (
            <Text key={i} variant="bodyRelaxed" color="textSecondary">
              {text.trim()}
            </Text>
          ))}
          <View style={styles.actions}>
            {video === null ? null : (
              <Button label="Ver execução" variant="secondary" icon={CirclePlay} style={styles.flex} onPress={() => setOverlay("video")} />
            )}
            <Button label="Ver progresso" variant="secondary" icon={ChartColumn} style={styles.flex} onPress={() => setOverlay("progress")} />
          </View>
        </View>

        <View style={styles.sets}>
          {exercise.sets.map((set) => {
            const holding = state.hold?.setId === set.id;
            const guide = strategyGuide(set);
            return (
              <WorkoutSetRow
                key={set.id}
                number={set.setNumber}
                target={setGoal(set)}
                hint={holding ? `de ${set.durationSeconds} s` : setHint(set)}
                weight={state.weights[set.id] ?? ""}
                onWeightChange={(text) => dispatch({ type: "setWeight", setId: set.id, text })}
                done={state.ticked[set.id] === true}
                onToggle={() => (state.ticked[set.id] ? untick(set.id) : tickSet(set.id, Date.now()))}
                current={set.id === current}
                strategy={
                  guide === null
                    ? undefined
                    : {
                        ...guide,
                        expanded: set.id === current,
                        onOpen: () => {
                          setStrategySet(set);
                          setOverlay("strategy");
                        },
                      }
                }
                timed={
                  isTimed(set)
                    ? {
                        holding,
                        remaining: holding && state.hold !== null ? clockText(secondsLeft(state.hold, now)) : undefined,
                        onHoldPress: () => {
                          if (holding) dispatch({ type: "stopHold" });
                          else {
                            const at = Date.now();
                            setNow(at);
                            dispatch({ type: "startHold", setId: set.id, now: at });
                          }
                        },
                      }
                    : undefined
                }
              />
            );
          })}
        </View>
      </Screen>
      {overlays}
    </>
  );
}

/** Opening waits on a queued finish or discard of the same workout that couldn't be sent yet. */
class SyncPendingError extends Error {}

function finishErrorMessage(error: unknown): string {
  return apiErrorMessage(error, "Não foi possível finalizar. Tente novamente.");
}

function totalOf(state: SessionState): number {
  return state.snapshot.exercises.reduce((total, e) => total + e.sets.length, 0);
}

const styles = StyleSheet.create({
  overview: { paddingTop: space[2], gap: space[4] },
  hero: { gap: sizes.exerciseCardLinesGap },
  doneNote: {
    flexDirection: "row",
    alignItems: "center",
    gap: space[2],
    paddingVertical: sizes.exerciseCardPadding,
    paddingHorizontal: space[3],
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.success,
    backgroundColor: withAlpha(colors.success, TINT_ALPHA),
  },
  rows: { gap: space[2] },
  content: { paddingTop: space[1], gap: space[5] },
  skeleton: { gap: space[3], paddingTop: space[2] },
  rounded: { borderRadius: radius.md },
  progress: { gap: space[2] },
  segments: { flexDirection: "row", gap: space[1] },
  segment: { flex: 1, height: space[1], borderRadius: radius.full },
  progressRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  seeAll: { flexDirection: "row", alignItems: "center", gap: space[1] },
  head: { gap: sizes.dayRowGap },
  actions: { flexDirection: "row", gap: space[3], paddingTop: space[1] },
  sets: { gap: sizes.dayRowGap },
  footer: { gap: space[3] },
  buttons: { flexDirection: "row", gap: space[3] },
  prev: {
    width: controls.height + space[1],
    height: controls.height,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  prevDisabled: { opacity: disabledOpacity.secondaryButton },
  pressed: { backgroundColor: colors.surfaceActive },
  flex: { flex: 1 },
});
