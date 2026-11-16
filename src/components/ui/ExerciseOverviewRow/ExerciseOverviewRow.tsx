import { ChevronRight, CircleCheck } from "lucide-react-native";
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";

import { colors, radius, sizes, space } from "@/theme";

import { Tag } from "../Badge";
import { ExerciseThumb } from "../ExerciseThumb";
import { Text } from "../Text";

export type ExerciseOverviewRowProps = {
  /** 1-based position in the workout. */
  position: number;
  name: string;
  /** "4 séries · 8–10 reps", "3 × 45 s". */
  setsText: string;
  /** `videoThumbnailUrl` of the exercise's video; null draws the placeholder. */
  thumbnail: string | null;
  hasVideo: boolean;
  muscleGroups: readonly string[];
  /** The session's sets done; absent before a session and on a workout finished this week. */
  progress?: { done: number; total: number; current: boolean };
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
};

/**
 * M Exercise Overview Row: thumb, "EXERCÍCIO n", name, sets and muscle groups, and on the right the
 * sets done with a chevron. Done (every set ticked) swaps the chevron for a success check and turns
 * the count success; the exercise the client is on is ringed and its count goes primary. The whole
 * row opens the exercise.
 */
export function ExerciseOverviewRow({
  position,
  name,
  setsText,
  thumbnail,
  hasVideo,
  muscleGroups,
  progress,
  onPress,
  style,
}: ExerciseOverviewRowProps) {
  const done = progress !== undefined && progress.total > 0 && progress.done === progress.total;
  const current = progress?.current === true && !done;
  const count = progress === undefined ? undefined : `${progress.done} de ${progress.total}`;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Exercício ${position}: ${name}. ${setsText}${count === undefined ? "" : `. ${count} ${progress?.total === 1 ? "série" : "séries"}${done ? ", concluído" : ""}`}`}
      accessibilityState={{ selected: current }}
      onPress={onPress}
      style={({ pressed }) => [styles.row, current ? styles.rowCurrent : null, pressed ? styles.pressed : null, style]}
    >
      <ExerciseThumb imageUri={thumbnail} hasVideo={hasVideo} />
      <View style={styles.col}>
        <Text variant="eyebrow" color="textTertiary" allowFontScaling={false}>
          {`EXERCÍCIO ${position}`}
        </Text>
        <Text variant="bodyMdStrong">{name}</Text>
        <Text variant="caption" color="textSecondary">
          {setsText}
        </Text>
        {muscleGroups.length === 0 ? null : (
          <View style={styles.groups}>
            {muscleGroups.map((group) => (
              <Tag key={group} label={group} compact />
            ))}
          </View>
        )}
      </View>
      <View style={styles.status}>
        {count === undefined ? null : (
          <Text variant="smallStrong" color={done ? "success" : current ? "primary" : "textSecondary"}>
            {count}
          </Text>
        )}
        {done ? <CircleCheck size={20} color={colors.success} /> : <ChevronRight size={18} color={colors.textTertiary} />}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: space[3],
    padding: space[3],
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  rowCurrent: { borderColor: colors.primary },
  pressed: { backgroundColor: colors.surfaceHover },
  col: { flex: 1, gap: space[1] },
  groups: { flexDirection: "row", flexWrap: "wrap", gap: sizes.exerciseCardLinesGap },
  status: { alignItems: "flex-end", gap: sizes.exerciseCardLinesGap },
});
