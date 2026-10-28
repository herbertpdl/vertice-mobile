import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { router, useLocalSearchParams } from "expo-router";
import { ChartColumn, ChevronLeft, CirclePlay, Ellipsis, List, Repeat, RotateCcw, Trash2 } from "lucide-react-native";
import { useEffect, useEffectEvent, useReducer, useRef, useState } from "react";
import { AppState, Platform, Pressable, StyleSheet, View } from "react-native";

import { ExerciseListSheet, ProgressSheet, StrategySheet, VideoSheet, WorkoutPickerSheet } from "@/components/domain";
import { NavBar, Screen } from "@/components/layout";
import {
  ActionSheet,
  Button,
  ConfirmDialog,
  ErrorState,
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
import type { FullWorkout, Workout, WorkoutLog, WorkoutSession, WorkoutSessionSet } from "@/lib/api/types";
import { fullWorkoutQueryKey } from "@/lib/api/workouts";
import {
  fetchWorkoutSession,
  restartWorkoutSession,
  workoutLogsQueryPrefix,
  workoutSessionQueryKey,
} from "@/lib/api/workoutSessions";
import { useMe } from "@/lib/auth";
import { dayOfWeekOf, weekStartOf } from "@/lib/calendar";
import { todayLocalIso } from "@/lib/format";
import { useIsOffline } from "@/lib/network";
import { shouldRetry } from "@/lib/query-client";
import { youtubeVideoId } from "@/lib/video";
import { dismissRestNotifications, useRestAlert, useRestNotification } from "@/lib/workoutSession/alerts";
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
  allTicked,
  clockText,
  currentExercise,
  currentSetId,
  initSession,
  inputToWeight,
  orderedExercises,
  pendingSets,
  secondsLeft,
  sessionReducer,
  stepRows,
  timerProgress,
  type SessionState,
} from "@/lib/workoutSession/engine";
import { exerciseSummary, isTimed, nextSetText, prescribedLoad, setGoal, strategyGuide, weightText } from "@/lib/workoutText";
import { colors, controls, disabledOpacity, radius, sizes, space } from "@/theme";

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
 * A - Treino (and Descanso, Isometria, Último exercício, Offline): the session, one exercise at a
 * time (PRD R29–R54). It opens the week's session; a workout already finished this week asks
 * whether to redo it first (R20).
 */
export function WorkoutSessionScreen() {
  const params = useLocalSearchParams<{ workoutId: string }>();
  const workoutId = Number(params.workoutId);
  const queryClient = useQueryClient();
  const [redo, setRedo] = useState<WorkoutSession | null>(null);
  // This workout's session as last seen on this device (§3.4): it opens offline, and online it's
  // what the client did that the server may not have yet.
  const [local] = useState(() => {
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
    // An earlier week's session was closed by the rollover: never resumed (its writes would all
    // be refused).
    if (stored.state.snapshot.workoutLog.weekStartDate !== weekStartOf(todayLocalIso())) {
      clearLocalSession(stored.logId);
      return null;
    }
    return stored;
  });
  const session = useQuery({
    queryKey: workoutSessionQueryKey(workoutId),
    queryFn: async ({ signal }) => {
      // What's still queued (a discard before a switch, the last ticks) lands before the snapshot.
      const drained = await whenDrained(OPEN_DRAIN_MS);
      // A finish or discard of this workout still waiting: the server's session is about to close,
      // so opening it now would queue new ticks behind it.
      const closing = pendingOperations().some(
        (op) => (op.kind === "complete" || op.kind === "discard") && op.workoutId === workoutId,
      );
      if (!drained && closing) throw new SyncPendingError();
      return fetchWorkoutSession(workoutId, { signal });
    },
    retry: (count, error) => !(error instanceof SyncPendingError) && shouldRetry(count, error),
    // One snapshot per opening (R29): never refetched under the client, dropped when they leave.
    staleTime: Infinity,
    gcTime: 0,
  });
  const restart = useMutation({
    mutationFn: () => restartWorkoutSession(workoutId),
    onSuccess: (started) => {
      setRedo(started);
      void queryClient.invalidateQueries({ queryKey: workoutLogsQueryPrefix });
    },
  });

  const header = <NavBar title="Treino" />;
  const offline = session.fetchStatus === "paused";
  // The local session is the one in progress unless the server says this week's is another one, or
  // done (finished elsewhere), or refuses it (a 4xx: the workout or the trainer is gone). Without
  // an answer — offline, a network error, a 5xx — the local one goes on.
  const unreachable = session.isError && isUnreachable(session.error);
  const server = session.data;
  const resume =
    redo === null &&
    local !== null &&
    (server === undefined
      ? offline || unreachable
      : server.workoutLog.id === local.logId && server.workoutLog.status === "IN_PROGRESS");
  const superseded = local !== null && !resume && (server !== undefined || (session.isError && !unreachable));
  useEffect(() => {
    if (superseded) clearLocalSession(local.logId);
  }, [superseded, local]);
  if (resume && local !== null) return <SessionView key={local.logId} snapshot={local.state.snapshot} restored={local} />;
  if (session.data === undefined) {
    return (
      <Screen header={header}>
        {session.error instanceof SyncPendingError ? (
          <ErrorState
            title="Enviando seu último treino"
            message="O treino que você finalizou ainda está sendo enviado. Tente de novo em instantes."
            onRetry={() => void session.refetch()}
            retrying={session.isFetching}
          />
        ) : offline ? (
          // A workout never opened on this device needs the connection once (R55, E28).
          <ErrorState
            title="Sem conexão"
            message="Conecte-se à internet para abrir este treino. Depois de aberto, ele funciona sem conexão."
            onRetry={() => void session.refetch()}
          />
        ) : session.isError ? (
          <ErrorState onRetry={() => void session.refetch()} retrying={session.isFetching} />
        ) : (
          <View style={styles.skeleton} accessible accessibilityLabel="Abrindo o treino">
            <Skeleton.Line width="70%" height={sizes.skeletonTitleHeight} />
            {[0, 1, 2, 3].map((i) => (
              <Skeleton.Block key={i} width="100%" height={sizes.workoutSetHeight} style={styles.rounded} />
            ))}
          </View>
        )}
      </Screen>
    );
  }

  const active = redo ?? session.data;
  if (active.workoutLog.status !== "IN_PROGRESS") {
    // Finished this week: a redo replaces it only once the redo is finished (R20–R23).
    return (
      <Screen header={header}>
        <ConfirmDialog
          visible
          icon={RotateCcw}
          tone="info"
          confirmVariant="primary"
          title="Refazer este treino?"
          message={`Você já concluiu o “${active.name}” nesta semana. Ao finalizar o novo, ele substitui o anterior (cargas e feedback). Se você descartar, o anterior continua valendo.`}
          confirmLabel="Refazer treino"
          loading={restart.isPending}
          error={restart.isError ? apiErrorMessage(restart.error, "Não foi possível começar de novo. Tente novamente.") : undefined}
          onConfirm={() => restart.mutateAsync().catch(() => {})}
          onCancel={() => (router.canGoBack() ? router.back() : router.replace("/aluno"))}
        />
      </Screen>
    );
  }
  return <SessionView key={active.workoutLog.id} snapshot={active} />;
}

type Overlay = "actions" | "list" | "video" | "progress" | "picker" | "strategy" | "finish" | "discard" | "switch" | null;

function SessionView({ snapshot, restored }: { snapshot: WorkoutSession; restored?: LocalSession }) {
  const queryClient = useQueryClient();
  const toast = useToast();
  const offline = useIsOffline();
  const { data: me } = useMe();
  const [state, dispatch] = useReducer(sessionReducer, snapshot, (s) => restored?.state ?? initSession(s));
  const [now, setNow] = useState(() => Date.now());
  const [overlay, setOverlay] = useState<Overlay>(null);
  const [switchTo, setSwitchTo] = useState<Workout | null>(null);
  /** The set whose strategy sheet is open (kept while it animates out). */
  const [strategySet, setStrategySet] = useState<WorkoutSessionSet | null>(null);
  const alert = useRestAlert();
  const logId = snapshot.workoutLog.id;
  const exercises = orderedExercises(snapshot);
  const exercise = currentExercise(state);
  const current = currentSetId(state);

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
    sent.current = { ...sent.current, [setId]: weight };
    save({ kind: "recordSet", logId, exerciseSetId: setId, weight, reps: set.reps });
    return true;
  };

  const alertedEnd = useRef<number | null>(null);

  /** Each clock tick: redraw, and end the hold (ticking its set) or the rest (alerting) when due. */
  const onClock = useEffectEvent((at: number) => {
    setNow(at);
    if (state.hold !== null && at >= state.hold.endsAt) {
      if (!tickSet(state.hold.setId, at)) dispatch({ type: "stopHold" });
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

  // ---- saving -----------------------------------------------------------------------------------

  /** Set once the session is finished or discarded: nothing is sent or kept for it after that. */
  const ended = useRef(false);

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
  if (exercise === undefined) {
    return (
      <Screen header={<NavBar title={snapshot.name} />}>
        <Text variant="body" color="textSecondary">
          Este treino ainda não tem exercícios.
        </Text>
      </Screen>
    );
  }

  const index = state.exerciseIndex;
  const last = allTicked(state);
  const video = youtubeVideoId(exercise.exercise.videoUrl) === null ? null : exercise.exercise.videoUrl;
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

  return (
    <>
      <Screen
        header={
          <>
            <NavBar
              title={snapshot.name}
              onBack={() => (router.canGoBack() ? router.back() : router.replace("/aluno"))}
              action={{ icon: Ellipsis, accessibilityLabel: "Ações do treino", onPress: () => setOverlay("actions") }}
            />
            {offline ? <StatusBanner kind="offline" message="Sem conexão. Seu treino será enviado quando a conexão voltar." /> : null}
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
            <Pressable accessibilityRole="button" onPress={() => setOverlay("list")} style={styles.seeAll} hitSlop={controls.hitTarget / 4}>
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

      <ActionSheet
        visible={overlay === "actions"}
        onClose={() => setOverlay(null)}
        title={snapshot.name}
        actions={[
          { icon: Repeat, label: "Trocar treino", onPress: () => setOverlay("picker") },
          { icon: Trash2, label: "Descartar treino", danger: true, onPress: () => setOverlay("discard") },
        ]}
      />
      <ExerciseListSheet
        visible={overlay === "list"}
        onClose={() => setOverlay(null)}
        steps={stepRows(state)}
        onPick={(i) => {
          setOverlay(null);
          dispatch({ type: "goTo", index: i });
        }}
        onFinish={() => closeSheetThen(requestFinish)}
        onDismiss={onSheetDismissed}
      />
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
      <StrategySheet
        visible={overlay === "strategy"}
        onClose={() => setOverlay(null)}
        setNumber={strategySet?.setNumber ?? 0}
        guide={strategySet === null ? null : strategyGuide(strategySet)}
      />
      {me === undefined ? null : (
        <ProgressSheet
          visible={overlay === "progress"}
          onClose={() => setOverlay(null)}
          exerciseId={exercise.exerciseId}
          exerciseName={exercise.exercise.name}
          clientId={me.id}
        />
      )}
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
}

/** Opening waits on a queued finish or discard of the same workout that couldn't be sent yet. */
class SyncPendingError extends Error {}

/** No answer from the server (offline, a timeout, a 5xx): not a refusal of the session. */
function isUnreachable(error: unknown): boolean {
  if (error instanceof SyncPendingError) return false;
  return !(error instanceof ApiError) || error.status === 0 || error.status >= 500;
}

function finishErrorMessage(error: unknown): string {
  return apiErrorMessage(error, "Não foi possível finalizar. Tente novamente.");
}

function totalOf(state: SessionState): number {
  return state.snapshot.exercises.reduce((total, e) => total + e.sets.length, 0);
}

const styles = StyleSheet.create({
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
