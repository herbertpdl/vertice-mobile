import { GripVertical, MessageSquare, Plus, Trash2 } from "lucide-react-native";
import { Pressable, StyleSheet, TextInput, View } from "react-native";

import { Text } from "@/components/ui/Text";
import { NOTES_MAX } from "@/lib/validation/bounds";
import { MAX_SETS, type EditorExercise, type SetFields } from "@/lib/workoutEditor/model";
import { colors, controls, radius, sizes, space, textStyle } from "@/theme";

import { SetHeader, SetRow } from "../SetRow";

export type ExerciseEditorCardProps = {
  exercise: EditorExercise;
  onUpdateSet: (setKey: string, patch: Partial<SetFields>) => void;
  onSetOptions: (setKey: string, index: number) => void;
  onAddSet: () => void;
  onNotesChange: (notes: string) => void;
  /** The grip: move the exercise up or down (an action sheet; drag is not in v1). */
  onMove: () => void;
  onRemove: () => void;
  /** A removal under this exercise was refused and undone: its border turns warning. */
  refused?: boolean;
  refusedSetKeys?: ReadonlySet<string>;
  disabled?: boolean;
};

/**
 * M Exercise Editor Card: grip, name + muscle groups, remove; the sets (M Set Header + M Set Row,
 * or "Nenhuma série adicionada"), M Add Row Button and M Note Field. The note is a real input with
 * a placeholder, so an exercise without one can get one (the design only shows a filled note).
 */
export function ExerciseEditorCard({
  exercise: we,
  onUpdateSet,
  onSetOptions,
  onAddSet,
  onNotesChange,
  onMove,
  onRemove,
  refused = false,
  refusedSetKeys,
  disabled = false,
}: ExerciseEditorCardProps) {
  const name = we.exercise.name;
  const groups = we.exercise.muscleGroups.map((group) => group.name).join(" · ");
  const atCap = we.sets.length >= MAX_SETS;

  return (
    <View style={[styles.card, refused ? styles.refused : null]}>
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Mover ${name}`}
          disabled={disabled}
          onPress={onMove}
          hitSlop={{ left: space[3], right: space[1] }}
          style={styles.grip}
        >
          <GripVertical size={sizes.rowGlyph} color={colors.textTertiary} />
        </Pressable>
        <View style={styles.title}>
          <Text variant="bodyMdStrong" numberOfLines={2}>
            {name}
          </Text>
          {groups === "" ? null : (
            <Text variant="small" color="textSecondary" numberOfLines={1}>
              {groups}
            </Text>
          )}
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Remover ${name}`}
          disabled={disabled}
          onPress={onRemove}
          style={styles.iconTap}
        >
          <Trash2 size={sizes.rowGlyph} color={colors.textSecondary} />
        </Pressable>
      </View>

      {we.sets.length === 0 ? (
        <View style={styles.empty}>
          <Text variant="caption" color="textSecondary">
            Nenhuma série adicionada
          </Text>
        </View>
      ) : (
        <>
          <SetHeader />
          <View style={styles.sets}>
            {we.sets.map((set, index) => (
              <SetRow
                key={set.key}
                set={set}
                number={index + 1}
                refused={refusedSetKeys?.has(set.key)}
                disabled={disabled}
                onUpdate={(patch) => onUpdateSet(set.key, patch)}
                onOptions={() => onSetOptions(set.key, index)}
              />
            ))}
          </View>
        </>
      )}

      {atCap ? (
        <Text variant="caption" color="textSecondary" style={styles.cap}>
          Máximo de {MAX_SETS} séries por exercício.
        </Text>
      ) : (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Adicionar série em ${name}`}
          disabled={disabled}
          onPress={onAddSet}
          style={styles.addRow}
        >
          {({ pressed }) => (
            <>
              <Plus size={16} color={pressed ? colors.primaryActive : colors.primary} />
              <Text variant="bodyStrong" color={pressed ? "primaryActive" : "primary"}>
                Adicionar série
              </Text>
            </>
          )}
        </Pressable>
      )}

      <View style={styles.note}>
        <MessageSquare size={14} color={colors.textSecondary} />
        <TextInput
          value={we.notes}
          onChangeText={onNotesChange}
          placeholder="Observação (opcional)"
          placeholderTextColor={colors.textTertiary}
          accessibilityLabel={`Observação de ${name}`}
          maxLength={NOTES_MAX}
          editable={!disabled}
          multiline
          style={styles.noteInput}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: sizes.editorCardPadding,
    gap: space[3],
  },
  refused: { borderColor: colors.warning },
  header: { flexDirection: "row", alignItems: "center", gap: sizes.editorHeaderGap },
  grip: { width: sizes.dragHandleWidth, height: controls.hitTarget, alignItems: "center", justifyContent: "center" },
  title: { flex: 1, gap: 2 },
  iconTap: { width: controls.hitTarget, height: controls.hitTarget, alignItems: "center", justifyContent: "center" },
  sets: { gap: space[2] },
  empty: {
    height: controls.hitTarget,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  addRow: { flexDirection: "row", alignItems: "center", gap: space[2], height: controls.hitTarget, alignSelf: "flex-start" },
  cap: { paddingVertical: space[1] },
  note: {
    flexDirection: "row",
    alignItems: "center",
    gap: space[2],
    minHeight: controls.hitTarget,
    paddingHorizontal: space[3],
    backgroundColor: colors.bg,
    borderRadius: radius.sm,
  },
  noteInput: {
    ...textStyle("caption"),
    flex: 1,
    color: colors.textPrimary,
    paddingVertical: space[2],
    paddingHorizontal: 0,
  },
});
