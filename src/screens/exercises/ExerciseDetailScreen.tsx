import { useMutation, useQueryClient } from "@tanstack/react-query";
import { router, useLocalSearchParams } from "expo-router";
import { EllipsisVertical, Lock, Pencil, Trash2 } from "lucide-react-native";
import { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";

import { NavBar, Screen } from "@/components/layout";
import {
  ActionSheet,
  Badge,
  Banner,
  Button,
  ConfirmDialog,
  ErrorState,
  Skeleton,
  StatusBanner,
  Text,
  useToast,
  VideoThumbnail,
} from "@/components/ui";
import { ApiError } from "@/lib/api/client";
import { deleteErrorMessage } from "@/lib/api/errorMessages";
import { deleteExercise, exerciseQueryKey, exercisesQueryPrefix } from "@/lib/api/exercises";
import { useIsOffline } from "@/lib/network";
import { useExercise } from "@/lib/useCatalog";
import { usePullToRefresh } from "@/lib/usePullToRefresh";
import { useRedirectOnError } from "@/lib/useRedirectOnError";
import { useOpenVideo } from "@/lib/useOpenVideo";
import { videoThumbnailUrl } from "@/lib/video";
import { sizes, space } from "@/theme";

/** Copy for a failed delete: a workout using it (409), not the trainer's (403), anything else. */
export function exerciseDeleteError(error: unknown): string {
  if (error instanceof ApiError && error.code === "FORBIDDEN") return "Você não tem permissão para excluir este exercício.";
  return deleteErrorMessage(error, "exercise", "Não foi possível excluir o exercício");
}

/**
 * M - Detalhe do Exercício (Vídeo) / (Padrão): the video thumbnail (opens the link), name, muscle
 * groups, description. The trainer's own exercise has ⋮ (Editar / Excluir) and "Editar exercício";
 * a starter one is read-only, with the "Exercício padrão" notice.
 */
export function ExerciseDetailScreen() {
  const params = useLocalSearchParams<{ id: string }>();
  const id = Number(params.id);
  const valid = Number.isInteger(id) && id > 0;
  const queryClient = useQueryClient();
  const toast = useToast();
  const offline = useIsOffline();
  const [sheet, setSheet] = useState<"actions" | "delete" | null>(null);
  const open = useOpenVideo();
  const exercise = useExercise(id, { enabled: valid });
  const pull = usePullToRefresh(() => exercise.refetch());
  useRedirectOnError(exercise.error, "Exercício não encontrado.", "/exercicios");
  useEffect(() => {
    if (!valid) router.replace("/exercicios");
  }, [valid]);

  const remove = useMutation({
    mutationFn: () => deleteExercise(id),
    onSuccess: () => {
      setSheet(null);
      void queryClient.invalidateQueries({ queryKey: exercisesQueryPrefix });
      // Still observed here: stale, not refetched (it would 404 and bounce a second time).
      void queryClient.invalidateQueries({ queryKey: exerciseQueryKey(id), refetchType: "none" });
      if (router.canGoBack()) router.back();
      else router.replace("/exercicios");
      toast.show("Exercício excluído.");
    },
    onError: (error) => {
      // Gone or not the trainer's any more (another device): the catalog row is stale.
      if (error instanceof ApiError && error.code === "FORBIDDEN") void queryClient.invalidateQueries({ queryKey: exercisesQueryPrefix });
    },
  });

  const data = exercise.data;
  const own = data !== undefined && !data.isStarter;
  const retry = { label: "Tentar", onPress: () => void exercise.refetch() };
  const header = (
    <>
      <NavBar
        title="Exercício"
        action={own ? { icon: EllipsisVertical, accessibilityLabel: "Ações do exercício", onPress: () => setSheet("actions") } : undefined}
      />
      {offline ? (
        <StatusBanner kind="offline" action={retry} />
      ) : exercise.isError && data !== undefined ? (
        <StatusBanner kind="error" action={retry} />
      ) : null}
    </>
  );

  if (!valid) return null;
  if (data === undefined) {
    return (
      <Screen header={header} contentStyle={styles.content}>
        {exercise.isError ? (
          <ErrorState onRetry={() => void exercise.refetch()} retrying={exercise.isFetching} />
        ) : (
          <View style={styles.content} accessible accessibilityLabel="Carregando exercício">
            <Skeleton.Block width="100%" height={sizes.skeletonInfoCardHeight} />
            <Skeleton.Line width="60%" />
            <Skeleton.Line width="90%" />
          </View>
        )}
      </Screen>
    );
  }

  const edit = () => router.push(`/exercicios/${id}/editar`);
  return (
    <>
      <Screen header={header} contentStyle={styles.content} refreshing={pull.refreshing} onRefresh={pull.onRefresh}>
        {data.videoUrl === "" ? null : <VideoThumbnail imageUri={videoThumbnailUrl(data.videoUrl)} onPress={() => void open(data.videoUrl)} />}
        <View style={styles.identity}>
          <Text variant="headline" accessibilityRole="header">
            {data.name}
          </Text>
          <View style={styles.badges}>
            {data.muscleGroups.map((group) => (
              <Badge key={group.id} label={group.name} />
            ))}
            {data.isStarter ? <Badge label="Padrão" tone="outline" /> : null}
          </View>
        </View>
        {data.description.trim() === "" ? null : (
          <Text variant="bodyMdRelaxed" color="textSecondary">
            {data.description}
          </Text>
        )}
        {own ? (
          <Button label="Editar exercício" variant="secondary" onPress={edit} />
        ) : (
          <Banner tone="info" icon={Lock} message="Exercício padrão — não pode ser editado." />
        )}
      </Screen>
      <ActionSheet
        visible={sheet === "actions"}
        onClose={() => setSheet(null)}
        title={data.name}
        actions={[
          { icon: Pencil, label: "Editar exercício", onPress: edit },
          { icon: Trash2, label: "Excluir exercício", danger: true, onPress: () => setSheet("delete") },
        ]}
      />
      <ConfirmDialog
        visible={sheet === "delete"}
        icon={Trash2}
        title="Excluir exercício?"
        message={`“${data.name}” será removido do seu catálogo.`}
        confirmLabel="Excluir exercício"
        loading={remove.isPending}
        error={remove.isError ? exerciseDeleteError(remove.error) : undefined}
        onConfirm={() => remove.mutateAsync().catch(() => {})}
        onCancel={() => {
          remove.reset();
          setSheet(null);
        }}
      />
    </>
  );
}

const styles = StyleSheet.create({
  content: { paddingTop: space[2], gap: space[4] },
  identity: { gap: space[2] },
  badges: { flexDirection: "row", flexWrap: "wrap", gap: sizes.exerciseCardLinesGap },
});
