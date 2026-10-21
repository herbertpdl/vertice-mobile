import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { router, useLocalSearchParams } from "expo-router";
import { useNavigation, usePreventRemove, type NavigationAction } from "expo-router/react-navigation";
import { ArrowDown, ArrowUp, ChevronRight, Copy, Dumbbell, EllipsisVertical, Plus, Trash2 } from "lucide-react-native";
import { useEffect, useState, type ReactNode } from "react";
import { Pressable, StyleSheet, View } from "react-native";

import { AddExerciseSheet, ExerciseEditorCard, SaveBar, saveBarFrame } from "@/components/domain";
import { NavBar, Screen } from "@/components/layout";
import {
  ActionSheet,
  Banner,
  ConfirmDialog,
  EmptyState,
  ErrorState,
  SelectField,
  Skeleton,
  StatusBanner,
  Text,
  TextField,
  useToast,
  type SheetAction,
} from "@/components/ui";
import { deleteErrorMessage } from "@/lib/api/errorMessages";
import { studentQueryKey, studentsQueryKey, fetchStudents } from "@/lib/api/students";
import { fetchTrainingPlan, trainingPlanQueryKey } from "@/lib/api/trainingPlans";
import type { DayOfWeek } from "@/lib/api/types";
import { deleteWorkout, fetchFullWorkout, fullWorkoutQueryKey } from "@/lib/api/workouts";
import { useMe } from "@/lib/auth";
import { DAY_NAMES, DAY_ORDER } from "@/lib/labels";
import { useIsOffline } from "@/lib/network";
import { useRedirectOnError } from "@/lib/useRedirectOnError";
import { useSingleFlight } from "@/lib/useSingleFlight";
import { NAME_MAX } from "@/lib/validation/bounds";
import { DEFAULT_WORKOUT_NAME, MAX_EXERCISES, MAX_SETS, emptyWorkout, fromFullWorkout, type EditorWorkout } from "@/lib/workoutEditor/model";
import { useWorkoutEditor, type WorkoutEditor } from "@/lib/workoutEditor/useWorkoutEditor";
import { colors, controls, radius, sizes, space } from "@/theme";

const DAY_OPTIONS = DAY_ORDER.map((day) => ({ value: day, label: DAY_NAMES[day] }));

function isDay(value: string | undefined): value is DayOfWeek {
  return value !== undefined && (DAY_ORDER as string[]).includes(value);
}

function validId(raw: string | undefined) {
  const id = Number(raw);
  return Number.isInteger(id) && id > 0 ? id : null;
}

/** `/planos/[id]/treinos/novo[?dayOfWeek=]`: M - Editor de Treino (Novo). */
export function NewWorkoutScreen() {
  const params = useLocalSearchParams<{ id: string; dayOfWeek?: string }>();
  return <WorkoutEditorLoader planId={validId(params.id)} workoutId={null} day={isDay(params.dayOfWeek) ? params.dayOfWeek : undefined} />;
}

/** `/treinos/[id]`: M - Editor de Treino. */
export function EditWorkoutScreen() {
  const params = useLocalSearchParams<{ id: string }>();
  const workoutId = validId(params.id);
  return <WorkoutEditorLoader planId={null} workoutId={workoutId} invalid={workoutId === null} />;
}

type LoaderProps = { planId: number | null; workoutId: number | null; day?: DayOfWeek; invalid?: boolean };

/** Loads the workout (when editing), the plan and who is signed in, then starts one editor session. */
function WorkoutEditorLoader({ planId: newPlanId, workoutId, day, invalid = false }: LoaderProps) {
  const creating = workoutId === null;
  const badRoute = invalid || (creating && newPlanId === null);
  const offline = useIsOffline();
  const me = useMe();
  const full = useQuery({
    queryKey: fullWorkoutQueryKey(workoutId ?? 0),
    queryFn: ({ signal }) => fetchFullWorkout(workoutId!, { signal }),
    enabled: !creating,
  });
  useRedirectOnError(full.error, "Treino não encontrado.", "/alunos");
  const planId = creating ? newPlanId : (full.data?.trainingPlanId ?? null);
  const plan = useQuery({
    queryKey: trainingPlanQueryKey(planId ?? 0),
    queryFn: ({ signal }) => fetchTrainingPlan(planId!, { signal }),
    enabled: planId !== null,
  });
  useRedirectOnError(creating ? plan.error : null, "Plano não encontrado.", "/alunos");
  // The student's name for the breadcrumb: from the roster, when it's loaded or cached.
  const students = useQuery({ queryKey: studentsQueryKey, queryFn: ({ signal }) => fetchStudents({ signal }) });
  useEffect(() => {
    if (badRoute) router.replace("/alunos");
  }, [badRoute]);

  // The session reads `initial` once: computed when the data first arrives, never from a refetch.
  const [initial, setInitial] = useState<EditorWorkout | null>(() => (creating ? emptyWorkout(day ?? "MONDAY") : null));
  if (initial === null && full.data !== undefined) setInitial(fromFullWorkout(full.data));

  const retry = () => {
    void full.refetch();
    void plan.refetch();
  };
  if (badRoute) return null;
  const ready = initial !== null && planId !== null && me.data !== undefined;
  if (!ready) {
    const failed = full.isError || me.isError || (creating && plan.isError);
    return (
      <Screen
        header={
          <>
            <NavBar title={creating ? "Novo treino" : "Editar treino"} />
            {offline ? <StatusBanner kind="offline" action={{ label: "Tentar", onPress: retry }} /> : null}
          </>
        }
        contentStyle={styles.content}
      >
        {failed ? (
          <ErrorState
            onRetry={() => {
              retry();
              void me.refetch();
            }}
            retrying={full.isFetching || me.isFetching}
          />
        ) : (
          <EditorSkeleton />
        )}
      </Screen>
    );
  }
  const studentName = students.data?.find((s) => s.id === plan.data?.clientId)?.name;
  return (
    <WorkoutEditorSession
      planId={planId}
      workoutId={workoutId}
      initial={initial}
      dayPreset={!creating || day !== undefined}
      userId={me.data.id}
      clientId={plan.data?.clientId}
      planName={plan.data?.name}
      studentName={studentName}
      offlineBanner={offline ? <StatusBanner kind="offline" action={{ label: "Tentar", onPress: retry }} /> : null}
    />
  );
}

function EditorSkeleton() {
  return (
    <View style={styles.skeleton}>
      <Skeleton.Block width="100%" height={controls.height} />
      <Skeleton.Block width="100%" height={controls.height} />
      <Skeleton.Block width="100%" height={sizes.skeletonFormHeight} />
    </View>
  );
}

type SessionProps = {
  planId: number;
  workoutId: number | null;
  initial: EditorWorkout;
  /** The weekday is known (an existing workout, or `?dayOfWeek=`); otherwise the trainer must pick one. */
  dayPreset: boolean;
  userId: number;
  clientId?: number;
  planName?: string;
  studentName?: string;
  offlineBanner: ReactNode;
};

type Sheet =
  | { kind: "add" | "actions" | "delete" | "discard" }
  | { kind: "leave"; action: NavigationAction }
  | { kind: "set"; exerciseKey: string; setKey: string; index: number }
  | { kind: "move"; exerciseKey: string; index: number };

/**
 * M - Editor de Treino / (Novo) / (Salvando): name, weekday, exercise cards with their sets, and
 * M Save Bar. The draft lives in the save engine the web's editor uses (`src/lib/workoutEditor`),
 * with saving left to the trainer: "Salvar treino" sends a new workout as one nested `POST`, and
 * an existing one as `PATCH` + whole-tree `PUT`, falling back to the one-item endpoints once a
 * client recorded data (409) — a refused removal comes back with a banner saying why.
 */
function WorkoutEditorSession({ planId, workoutId, initial, dayPreset, userId, clientId, planName, studentName, offlineBanner }: SessionProps) {
  const queryClient = useQueryClient();
  const toast = useToast();
  const navigation = useNavigation();
  const [sheet, setSheet] = useState<Sheet | null>(null);
  const [addKey, setAddKey] = useState(0);
  const [saving, setSaving] = useState(false);

  const editor: WorkoutEditor = useWorkoutEditor({
    planId,
    workoutId,
    initial,
    userId,
    onSaved: ({ workoutId: savedId }) => {
      void queryClient.invalidateQueries({ queryKey: fullWorkoutQueryKey(savedId) });
      void queryClient.invalidateQueries({ queryKey: trainingPlanQueryKey(planId) });
      if (clientId !== undefined) void queryClient.invalidateQueries({ queryKey: studentQueryKey(clientId) });
    },
  });
  const { state, engine, restored, markLeft } = editor;
  const { draft, refusal } = state;
  const [dayChosen, setDayChosen] = useState(dayPreset || restored);
  const isNew = state.workoutId === null;
  const busy = saving || state.status === "saving";

  // Leaving with unsaved changes asks first (M - Descartar alterações). The check reads the engine,
  // not this render: right after a save the draft is clean before React has re-rendered.
  usePreventRemove(state.dirty, ({ data }) => {
    if (engine.getState().dirty) setSheet({ kind: "leave", action: data.action });
    else navigation.dispatch(data.action);
  });

  const leave = () => {
    markLeft();
    if (router.canGoBack()) router.back();
    else router.replace(`/planos/${planId}`);
  };

  const save = useSingleFlight(async () => {
    setSaving(true);
    const ok = await engine.finish();
    setSaving(false);
    const after = engine.getState();
    // A refused removal (or rejected tree) stays on screen with its banner; a failure shows in the bar.
    if (!ok || after.refusal !== null || after.dirty) return;
    leave();
    toast.show(isNew || workoutId === null ? "Treino criado." : "Treino salvo.");
  });

  const remove = useMutation({
    mutationFn: () => deleteWorkout(state.workoutId!),
    onSuccess: () => {
      engine.dispose();
      void queryClient.invalidateQueries({ queryKey: trainingPlanQueryKey(planId) });
      if (clientId !== undefined) void queryClient.invalidateQueries({ queryKey: studentQueryKey(clientId) });
      // Still observed here: stale, not refetched (it would 404 and bounce a second time).
      void queryClient.invalidateQueries({ queryKey: fullWorkoutQueryKey(state.workoutId!), refetchType: "none" });
      setSheet(null);
      leave();
      toast.show("Treino excluído.");
    },
  });

  const workoutName = draft.name.trim() || DEFAULT_WORKOUT_NAME;
  const atCap = draft.exercises.length >= MAX_EXERCISES;
  const refusedExercises = new Set(refusal?.exerciseKeys ?? []);
  const refusedSets = new Set(refusal?.setKeys ?? []);
  const canSave = state.dirty && dayChosen && !busy;

  const setActions = (target: Extract<Sheet, { kind: "set" }>): SheetAction[] => {
    const we = draft.exercises.find((e) => e.key === target.exerciseKey);
    if (we === undefined) return [];
    const { exerciseKey, setKey, index } = target;
    return [
      ...(we.sets.length < MAX_SETS ? [{ icon: Copy, label: "Duplicar série", onPress: () => engine.dispatch({ type: "duplicateSet", exerciseKey, setKey }) }] : []),
      ...(index > 0 ? [{ icon: ArrowUp, label: "Mover para cima", onPress: () => engine.dispatch({ type: "moveSet", exerciseKey, setKey, toIndex: index - 1 }) }] : []),
      ...(index < we.sets.length - 1
        ? [{ icon: ArrowDown, label: "Mover para baixo", onPress: () => engine.dispatch({ type: "moveSet", exerciseKey, setKey, toIndex: index + 2 }) }]
        : []),
      { icon: Trash2, label: "Remover série", danger: true, onPress: () => engine.dispatch({ type: "removeSet", exerciseKey, setKey }) },
    ];
  };
  const moveActions = ({ exerciseKey, index }: Extract<Sheet, { kind: "move" }>): SheetAction[] => [
    ...(index > 0 ? [{ icon: ArrowUp, label: "Mover para cima", onPress: () => engine.dispatch({ type: "moveExercise", exerciseKey, toIndex: index - 1 }) }] : []),
    ...(index < draft.exercises.length - 1
      ? [{ icon: ArrowDown, label: "Mover para baixo", onPress: () => engine.dispatch({ type: "moveExercise", exerciseKey, toIndex: index + 2 }) }]
      : []),
  ];

  const footer =
    isNew ? (
      <SaveBar
        status={state.status === "error" ? { message: state.errorMessage ?? "Não foi possível salvar.", tone: "danger" } : undefined}
        secondary={{ label: "Cancelar", disabled: busy, onPress: () => router.back() }}
        primary={{ label: busy ? "Salvando…" : "Salvar treino", disabled: !canSave && !busy, loading: busy, onPress: () => void save() }}
      />
    ) : state.dirty || busy || state.status === "error" ? (
      <SaveBar
        status={
          state.status === "error"
            ? { message: state.errorMessage ?? "Não foi possível salvar.", tone: "danger" }
            : busy
              ? { message: "Salvando alterações…", tone: "warning" }
              : { message: "Alterações não salvas", tone: "warning" }
        }
        secondary={{ label: "Descartar", disabled: busy || !state.dirty, onPress: () => setSheet({ kind: "discard" }) }}
        primary={{
          label: busy ? "Salvando…" : state.status === "error" ? "Tentar novamente" : "Salvar treino",
          disabled: !canSave && !busy,
          loading: busy,
          onPress: () => void save(),
        }}
      />
    ) : undefined;

  return (
    <>
      <Screen
        header={
          <>
            <NavBar
              title={isNew ? "Novo treino" : "Editar treino"}
              action={isNew ? undefined : { icon: EllipsisVertical, accessibilityLabel: "Ações do treino", onPress: () => setSheet({ kind: "actions" }) }}
            />
            {offlineBanner}
          </>
        }
        footer={footer}
        footerStyle={footer === undefined ? undefined : saveBarFrame}
        contentStyle={styles.content}
      >
        {planName === undefined ? null : (
          <View style={styles.crumbs} accessibilityRole="text" accessibilityLabel={[studentName, planName, workoutName].filter(Boolean).join(", ")}>
            {[studentName, planName].filter((part): part is string => part !== undefined).map((part) => (
              <View key={part} style={styles.crumb}>
                <Text variant="body" color="textTertiary" numberOfLines={1} style={styles.shrink}>
                  {part}
                </Text>
                <ChevronRight size={14} color={colors.textTertiary} />
              </View>
            ))}
            <Text variant="bodyStrong" color="textSecondary" numberOfLines={1} style={styles.shrink}>
              {isNew && draft.name.trim() === "" ? "Novo treino" : workoutName}
            </Text>
          </View>
        )}
        {restored ? <Banner tone="info" message="Recuperamos as alterações não salvas deste treino. Salve para não perdê-las." /> : null}
        {refusal === null ? null : <Banner message={`${refusal.title}. ${refusal.body}`} />}
        <TextField
          label="Nome do treino"
          placeholder="Ex.: Treino A — Superior"
          value={draft.name}
          onChangeText={(name) => engine.dispatch({ type: "setName", name })}
          maxLength={NAME_MAX}
          autoCapitalize="sentences"
          disabled={busy}
        />
        <SelectField
          label="Dia da semana"
          placeholder="Selecione"
          value={dayChosen ? draft.dayOfWeek : null}
          options={DAY_OPTIONS}
          disabled={busy}
          onChange={(dayOfWeek) => {
            setDayChosen(true);
            engine.dispatch({ type: "setDayOfWeek", dayOfWeek });
          }}
        />
        {draft.exercises.length === 0 ? (
          <EmptyState icon={Dumbbell} title="Nenhum exercício ainda" message="Adicione exercícios do catálogo para montar este treino." />
        ) : (
          <View style={styles.cards}>
            {draft.exercises.map((we, index) => (
              <ExerciseEditorCard
                key={we.key}
                exercise={we}
                disabled={busy}
                refused={refusedExercises.has(we.key)}
                refusedSetKeys={refusedSets}
                onUpdateSet={(setKey, patch) => engine.dispatch({ type: "updateSet", exerciseKey: we.key, setKey, patch })}
                onSetOptions={(setKey, setIndex) => setSheet({ kind: "set", exerciseKey: we.key, setKey, index: setIndex })}
                onAddSet={() => engine.dispatch({ type: "addSet", exerciseKey: we.key })}
                onNotesChange={(notes) => engine.dispatch({ type: "updateExercise", exerciseKey: we.key, patch: { notes } })}
                onMove={() => setSheet({ kind: "move", exerciseKey: we.key, index })}
                onRemove={() => engine.dispatch({ type: "removeExercise", exerciseKey: we.key })}
              />
            ))}
          </View>
        )}
        {atCap ? (
          <Text variant="caption" color="textSecondary" align="center">
            Este treino já tem {MAX_EXERCISES} exercícios — o máximo permitido.
          </Text>
        ) : (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Adicionar exercício"
            disabled={busy}
            onPress={() => {
              setAddKey((k) => k + 1);
              setSheet({ kind: "add" });
            }}
            style={({ pressed }) => [styles.addExercise, pressed ? styles.addPressed : null]}
          >
            <Plus size={20} color={colors.primary} />
            <Text variant="bodyLgStrong" color="primary">
              Adicionar exercício
            </Text>
          </Pressable>
        )}
      </Screen>

      <AddExerciseSheet
        key={addKey}
        visible={sheet?.kind === "add"}
        onClose={() => setSheet(null)}
        remaining={MAX_EXERCISES - draft.exercises.length}
        onAdd={(exercises) => {
          for (const exercise of exercises) engine.dispatch({ type: "addExercise", exercise });
          setSheet(null);
        }}
      />
      <ActionSheet
        visible={sheet?.kind === "set"}
        onClose={() => setSheet(null)}
        title={sheet?.kind === "set" ? `Série ${sheet.index + 1}` : ""}
        actions={sheet?.kind === "set" ? setActions(sheet) : []}
      />
      <ActionSheet
        visible={sheet?.kind === "move"}
        onClose={() => setSheet(null)}
        title={sheet?.kind === "move" ? (draft.exercises[sheet.index]?.exercise.name ?? "") : ""}
        actions={sheet?.kind === "move" ? moveActions(sheet) : []}
      />
      <ActionSheet
        visible={sheet?.kind === "actions"}
        onClose={() => setSheet(null)}
        title={workoutName}
        actions={[{ icon: Trash2, label: "Excluir treino", danger: true, onPress: () => setSheet({ kind: "delete" }) }]}
      />
      <ConfirmDialog
        visible={sheet?.kind === "delete"}
        icon={Trash2}
        title="Excluir treino?"
        message={`“${workoutName}” e todas as suas séries serão removidos do plano.`}
        confirmLabel="Excluir treino"
        loading={remove.isPending}
        error={remove.isError ? deleteErrorMessage(remove.error, "workout", "Não foi possível excluir o treino") : undefined}
        onConfirm={() => remove.mutateAsync().catch(() => {})}
        onCancel={() => {
          remove.reset();
          setSheet(null);
        }}
      />
      <ConfirmDialog
        visible={sheet?.kind === "discard" || sheet?.kind === "leave"}
        tone="warning"
        title="Descartar alterações?"
        message="As alterações feitas neste treino ainda não foram salvas e serão perdidas."
        confirmLabel="Descartar"
        cancelLabel="Continuar editando"
        onConfirm={() => {
          if (sheet?.kind === "leave") {
            markLeft();
            setSheet(null);
            navigation.dispatch(sheet.action);
          } else {
            engine.discard();
            setDayChosen(dayPreset);
            setSheet(null);
          }
        }}
        onCancel={() => setSheet(null)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  content: { paddingTop: space[2], gap: space[5] },
  skeleton: { gap: space[5] },
  crumbs: { flexDirection: "row", alignItems: "center", gap: space[2], flexWrap: "nowrap" },
  crumb: { flexDirection: "row", alignItems: "center", gap: space[2], flexShrink: 1 },
  shrink: { flexShrink: 1 },
  cards: { gap: space[3] },
  addExercise: {
    height: controls.height,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: space[2],
  },
  addPressed: { backgroundColor: colors.surfaceHover },
});
