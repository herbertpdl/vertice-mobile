import { StyleSheet, View } from "react-native";

import { Banner, Sheet, WorkoutPickRow, type WorkoutPickState } from "@/components/ui";
import type { DayOfWeek, Workout } from "@/lib/api/types";
import { DAY_ABBR, DAY_NAMES, DAY_ORDER } from "@/lib/labels";
import { sizes } from "@/theme";

export type WorkoutPickerSheetProps = {
  visible: boolean;
  onClose: () => void;
  /** The workouts to offer (the plan's, or just today's when several share the day). */
  workouts: Workout[];
  /** Exercises per workout id; 0 makes a workout unavailable (R17). Missing = still loading. */
  exerciseCounts: ReadonlyMap<number, number>;
  /** Workouts finished this week (picking one offers to redo it). */
  finished: ReadonlySet<number>;
  today: DayOfWeek;
  /** "Hoje (terça) não tem treino no seu plano…" above the list. */
  notice?: string;
  onPick: (workout: Workout) => void;
  /** iOS only: the sheet finished animating out (open a dialog from here, see `ActionSheet`). */
  onDismiss?: () => void;
};

function plural(count: number): string {
  return `${count} ${count === 1 ? "exercício" : "exercícios"}`;
}

/** The row's state and second line for one workout. */
export function pickRow(
  workout: Workout,
  count: number | undefined,
  finished: ReadonlySet<number>,
  today: DayOfWeek,
): { state: WorkoutPickState; meta: string } {
  if (count === 0) return { state: "unavailable", meta: "Sem exercícios" };
  if (finished.has(workout.id)) return { state: "done", meta: "Feito esta semana" };
  return { state: workout.dayOfWeek === today ? "today" : "default", meta: count === undefined ? "" : plural(count) };
}

/**
 * A - Escolher Treino (Sheet): the plan's workouts by weekday (Monday first), today's highlighted,
 * the ones done this week badged, the ones without exercises disabled (PRD R14–R17).
 */
export function WorkoutPickerSheet({ visible, onClose, workouts, exerciseCounts, finished, today, notice, onPick, onDismiss }: WorkoutPickerSheetProps) {
  const ordered = [...workouts].sort((a, b) => DAY_ORDER.indexOf(a.dayOfWeek) - DAY_ORDER.indexOf(b.dayOfWeek));
  return (
    <Sheet visible={visible} onClose={onClose} onDismiss={onDismiss} title="Escolher treino">
      {notice === undefined ? null : <Banner tone="info" message={notice} />}
      <View style={styles.list}>
      {ordered.map((workout) => {
        const row = pickRow(workout, exerciseCounts.get(workout.id), finished, today);
        return (
          <WorkoutPickRow
            key={workout.id}
            day={DAY_ABBR[workout.dayOfWeek]}
            dayName={DAY_NAMES[workout.dayOfWeek]}
            name={workout.name}
            meta={row.meta}
            state={row.state}
            onPress={() => onPick(workout)}
          />
        );
      })}
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  list: { gap: sizes.cardListGap },
});
