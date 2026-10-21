import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, type ReactNode } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { StyleSheet, View } from "react-native";

import { FormTextField } from "@/components/form";
import { NavBar, Screen } from "@/components/layout";
import { Banner, Button, ErrorState, MultiSelectField, Skeleton, StatusBanner, TextArea, useToast, VideoThumbnail } from "@/components/ui";
import { ApiError } from "@/lib/api/client";
import { apiErrorMessage } from "@/lib/api/errorMessages";
import { createExercise, exerciseQueryKey, exercisesQueryPrefix, updateExercise } from "@/lib/api/exercises";
import { workoutsQueryPrefix } from "@/lib/api/workouts";
import type { Exercise } from "@/lib/api/types";
import { useIsOffline } from "@/lib/network";
import { useExercise, useMuscleGroups } from "@/lib/useCatalog";
import { useRedirectOnError } from "@/lib/useRedirectOnError";
import { useSingleFlight } from "@/lib/useSingleFlight";
import { DESCRIPTION_MAX, HTTP_URL_PATTERN, NAME_MAX, VIDEO_URL_MAX } from "@/lib/validation/bounds";
import { exerciseSchema, type ExerciseFormInput } from "@/lib/validation/exercises";
import { useOpenVideo } from "@/lib/useOpenVideo";
import { videoThumbnailUrl } from "@/lib/video";
import { sizes, space } from "@/theme";

/** Copy for a failed save, keyed on the code (the BFF's message is English and never shown). */
export function exerciseSaveError(error: unknown, editing: boolean): string {
  if (editing && error instanceof ApiError && error.code === "FORBIDDEN") return "Você não tem permissão para alterar este exercício.";
  return apiErrorMessage(error, "Não foi possível salvar o exercício");
}

/**
 * M - Novo Exercício, and its edit mode: `/exercicios/novo` creates, `/exercicios/[id]/editar`
 * edits the trainer's own exercise (a starter one sends the trainer back to its detail). Rules are
 * the web's `exerciseSchema`: a name, at least one muscle group, an http(s) video link or none.
 */
export function ExerciseFormScreen() {
  const params = useLocalSearchParams<{ id?: string }>();
  const editing = params.id !== undefined;
  const id = Number(params.id);
  const badId = editing && !(Number.isInteger(id) && id > 0);
  const offline = useIsOffline();
  const exercise = useExercise(id, { enabled: editing && !badId });
  const groups = useMuscleGroups();
  useRedirectOnError(exercise.error, "Exercício não encontrado.", "/exercicios");
  const locked = exercise.data?.isStarter === true;
  useEffect(() => {
    // A starter exercise is read-only, and an id that can't exist has nothing to edit.
    if (!locked && !badId) return;
    if (router.canGoBack()) router.back();
    else router.replace(locked ? `/exercicios/${id}` : "/exercicios");
  }, [locked, badId, id]);

  const retry = () => {
    void exercise.refetch();
    void groups.refetch();
  };
  const header = (
    <>
      <NavBar title={editing ? "Editar exercício" : "Novo exercício"} />
      {offline ? (
        <StatusBanner kind="offline" action={{ label: "Tentar", onPress: retry }} />
      ) : exercise.isError && exercise.data !== undefined ? (
        <StatusBanner kind="error" action={{ label: "Tentar", onPress: retry }} />
      ) : null}
    </>
  );
  if (locked || badId) return null;
  if ((editing && exercise.data === undefined) || groups.data === undefined) {
    return (
      <Screen header={header}>
        {exercise.isError || groups.isError ? (
          <ErrorState onRetry={retry} retrying={exercise.isFetching || groups.isFetching} />
        ) : (
          <Skeleton.Block width="100%" height={sizes.skeletonFormHeight} />
        )}
      </Screen>
    );
  }
  return (
    <ExerciseForm
      header={header}
      exercise={exercise.data}
      groupOptions={groups.data.map((group) => ({ value: group.id, label: group.name }))}
    />
  );
}

function ExerciseForm({
  header,
  exercise,
  groupOptions,
}: {
  header: ReactNode;
  exercise?: Exercise;
  groupOptions: { value: number; label: string }[];
}) {
  const queryClient = useQueryClient();
  const toast = useToast();
  const open = useOpenVideo();
  const {
    control,
    handleSubmit,
    formState: { isSubmitting },
  } = useForm<ExerciseFormInput>({
    resolver: zodResolver(exerciseSchema),
    defaultValues: exercise
      ? {
          name: exercise.name,
          muscleGroupIds: exercise.muscleGroups.map((group) => group.id),
          description: exercise.description,
          videoUrl: exercise.videoUrl,
        }
      : { name: "", muscleGroupIds: [], description: "", videoUrl: "" },
  });
  const videoUrl = useWatch({ control, name: "videoUrl" })?.trim() ?? "";

  const save = useMutation({
    mutationFn: (values: ExerciseFormInput) => {
      const body = {
        name: values.name.trim(),
        muscleGroupIds: values.muscleGroupIds,
        description: values.description.trim(),
        videoUrl: (values.videoUrl ?? "").trim(),
      };
      return exercise === undefined ? createExercise(body) : updateExercise(exercise.id, body);
    },
    onSuccess: (saved) => {
      void queryClient.invalidateQueries({ queryKey: exercisesQueryPrefix });
      void queryClient.invalidateQueries({ queryKey: exerciseQueryKey(saved.id) });
      // Workout trees embed the catalog entry (name, groups): editors opened later show the edit.
      void queryClient.invalidateQueries({ queryKey: workoutsQueryPrefix });
      if (exercise === undefined) {
        // The new detail opens with its data: no skeleton flash.
        queryClient.setQueryData(exerciseQueryKey(saved.id), saved);
        router.replace(`/exercicios/${saved.id}`);
        toast.show("Exercício criado.");
      } else {
        router.back();
        toast.show("Exercício atualizado.");
      }
    },
    onError: (error) => {
      if (error instanceof ApiError && error.code === "FORBIDDEN") void queryClient.invalidateQueries({ queryKey: exercisesQueryPrefix });
    },
  });
  const busy = isSubmitting || save.isPending;
  const submit = useSingleFlight(handleSubmit((values) => save.mutateAsync(values).catch(() => {})));
  const preview = HTTP_URL_PATTERN.test(videoUrl);

  return (
    <Screen
      header={header}
      contentStyle={styles.content}
      footer={
        <View style={styles.footer}>
          <Button label="Cancelar" variant="secondary" style={styles.flex} disabled={busy} onPress={() => router.back()} />
          <Button label={exercise === undefined ? "Criar exercício" : "Salvar alterações"} style={styles.flex} loading={busy} onPress={() => void submit()} />
        </View>
      }
    >
      {save.isError ? <Banner message={exerciseSaveError(save.error, exercise !== undefined)} /> : null}
      <FormTextField control={control} name="name" label="Nome do exercício" placeholder="Ex.: Remada Curvada" autoCapitalize="sentences" maxLength={NAME_MAX} />
      <Controller
        control={control}
        name="muscleGroupIds"
        render={({ field: { value, onChange }, fieldState: { error } }) => (
          <MultiSelectField
            label="Grupos musculares"
            values={value}
            options={groupOptions}
            onChange={onChange}
            placeholder="Selecione"
            minSelected={1}
            error={error?.message}
          />
        )}
      />
      <Controller
        control={control}
        name="description"
        render={({ field: { value, onChange, onBlur }, fieldState: { error } }) => (
          <TextArea
            label="Descrição"
            placeholder="Execução, cuidados, variações…"
            value={value}
            onChangeText={onChange}
            onBlur={onBlur}
            maxLength={DESCRIPTION_MAX}
            error={error?.message}
          />
        )}
      />
      <FormTextField
        control={control}
        name="videoUrl"
        label="URL do vídeo (opcional)"
        placeholder="https://"
        help="Cole um link do YouTube ou Vimeo."
        keyboardType="url"
        autoCapitalize="none"
        autoCorrect={false}
        maxLength={VIDEO_URL_MAX}
      />
      {preview ? <VideoThumbnail imageUri={videoThumbnailUrl(videoUrl)} onPress={() => void open(videoUrl)} /> : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingTop: space[2], gap: space[5] },
  footer: { flexDirection: "row", gap: space[3] },
  flex: { flex: 1 },
});
