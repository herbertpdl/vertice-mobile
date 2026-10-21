import { Check, ChevronRight } from "lucide-react-native";
import { Pressable, StyleSheet, View } from "react-native";

import { Badge } from "@/components/ui/Badge";
import { ExerciseThumb } from "@/components/ui/ExerciseThumb";
import { Text } from "@/components/ui/Text";
import type { Exercise } from "@/lib/api/types";
import { videoThumbnailUrl } from "@/lib/video";
import { colors, disabledOpacity, radius, sizes, space } from "@/theme";

export type ExerciseCardProps = {
  exercise: Exercise;
  onPress: () => void;
  /**
   * `undefined`: a catalog row (chevron, opens the exercise). A boolean: M Exercise Pick Card in
   * the "Adicionar exercício" sheet — a checkbox, and a primary border when picked.
   */
  selected?: boolean;
  disabled?: boolean;
};

/**
 * M Exercise Card (thumb, name, muscle-group badges + "Padrão" for a starter exercise, chevron)
 * and its pick variants M Exercise Pick Card / Selected. The whole card is the touch target.
 */
export function ExerciseCard({ exercise, onPress, selected, disabled = false }: ExerciseCardProps) {
  const picking = selected !== undefined;
  const thumb = videoThumbnailUrl(exercise.videoUrl);
  return (
    <Pressable
      accessibilityRole={picking ? "checkbox" : "button"}
      accessibilityLabel={exercise.name}
      accessibilityState={picking ? { checked: selected, disabled } : { disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        selected ? styles.selected : null,
        pressed ? styles.pressed : null,
        disabled ? styles.disabled : null,
      ]}
    >
      <ExerciseThumb imageUri={thumb} hasVideo={exercise.videoUrl !== ""} />
      <View style={styles.body}>
        <Text variant="bodyMdStrong" numberOfLines={2}>
          {exercise.name}
        </Text>
        <View style={styles.badges}>
          {exercise.muscleGroups.map((group) => (
            <Badge key={group.id} label={group.name} />
          ))}
          {exercise.isStarter ? <Badge label="Padrão" tone="outline" /> : null}
        </View>
      </View>
      {picking ? (
        <View style={[styles.box, selected ? styles.checked : styles.unchecked]}>
          {selected ? <Check size={16} color={colors.primaryText} strokeWidth={3} /> : null}
        </View>
      ) : (
        <ChevronRight size={20} color={colors.textTertiary} />
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: space[3],
    padding: sizes.exerciseCardPadding,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  selected: { borderColor: colors.primary },
  pressed: { backgroundColor: colors.surfaceHover },
  disabled: { opacity: disabledOpacity.field },
  body: { flex: 1, gap: sizes.exerciseCardLinesGap },
  badges: { flexDirection: "row", flexWrap: "wrap", gap: sizes.exerciseCardLinesGap },
  box: {
    width: sizes.checkbox,
    height: sizes.checkbox,
    borderRadius: radius.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  checked: { backgroundColor: colors.primary },
  unchecked: { borderWidth: sizes.checkboxBorderWidth, borderColor: colors.borderStrong },
});
