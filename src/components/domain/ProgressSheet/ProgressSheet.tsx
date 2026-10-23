import { useQuery } from "@tanstack/react-query";
import { ChartColumn } from "lucide-react-native";
import { StyleSheet, View } from "react-native";

import { EmptyState, ErrorState, Sheet, Skeleton, StatCard, Text } from "@/components/ui";
import { exerciseProgressQueryKey, fetchExerciseProgress } from "@/lib/api/exercises";
import type { ExerciseProgressPoint } from "@/lib/api/types";
import { formatWeight } from "@/lib/format";
import { sizes, space } from "@/theme";

import { recentWeeks, WeightChart } from "../WeightChart";

export type ProgressSheetProps = {
  visible: boolean;
  onClose: () => void;
  exerciseId: number;
  exerciseName: string;
  /** The signed-in client (the progress query's key). */
  clientId: number;
};

/** "+7,5 kg em 7 semanas" from the weeks the chart shows; undefined with fewer than two. */
export function progressDelta(points: ExerciseProgressPoint[]): { value: string; helper: string } | undefined {
  if (points.length < 2) return undefined;
  const delta = points[points.length - 1].weight - points[0].weight;
  const sign = delta > 0 ? "+" : delta < 0 ? "−" : "";
  return { value: `${sign}${formatWeight(Math.abs(delta))} kg`, helper: `em ${points.length} semanas` };
}

/**
 * A - Progresso do Exercício (Sheet): the heaviest weight the client recorded per week, finished
 * sessions only (R63), with the latest and the change over the weeks shown.
 */
export function ProgressSheet({ visible, onClose, exerciseId, exerciseName, clientId }: ProgressSheetProps) {
  const progress = useQuery({
    queryKey: exerciseProgressQueryKey(exerciseId, clientId),
    queryFn: () => fetchExerciseProgress(exerciseId),
    enabled: visible,
  });
  const points = progress.data === undefined ? [] : recentWeeks(progress.data);
  const latest = points[points.length - 1];
  const delta = progressDelta(points);
  return (
    <Sheet visible={visible} onClose={onClose} title={`Progresso · ${exerciseName}`}>
      {progress.data === undefined ? (
        progress.isError ? (
          <ErrorState onRetry={() => void progress.refetch()} retrying={progress.isFetching} />
        ) : (
          <Skeleton.Block width="100%" height={sizes.chartAreaHeight} />
        )
      ) : points.length === 0 ? (
        <EmptyState
          icon={ChartColumn}
          title="Sem progresso ainda"
          message="Quando você finalizar treinos com carga neste exercício, sua evolução aparece aqui."
        />
      ) : (
        <>
          <View style={styles.stats}>
            <StatCard label="MAIOR CARGA" value={`${formatWeight(latest.weight)} kg`} helper="última semana" />
            {delta === undefined ? null : <StatCard label="EVOLUÇÃO" value={delta.value} helper={delta.helper} />}
          </View>
          <WeightChart points={progress.data} />
          <Text variant="small" color="textTertiary">
            Conta só treinos finalizados. Semanas sem carga registrada não aparecem.
          </Text>
        </>
      )}
    </Sheet>
  );
}

const styles = StyleSheet.create({
  stats: { flexDirection: "row", gap: space[3] },
});
