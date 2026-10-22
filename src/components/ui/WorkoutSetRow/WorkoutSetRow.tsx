import { Check, Play, Square } from "lucide-react-native";
import { Pressable, StyleSheet, TextInput, View, type StyleProp, type ViewStyle } from "react-native";

import { colors, controls, radius, sizes, space, textStyle, TINT_ALPHA, WEIGHT_INPUT_MAX_SCALE, withAlpha } from "@/theme";

import { Text } from "../Text";

/** The fill and ring of a done set (M Workout Set Done: success at `0F` and `59`). */
const DONE_FILL = withAlpha(colors.success, 0x0f / 255);
const DONE_RING = withAlpha(colors.success, 0x59 / 255);
const HOLD_FILL = withAlpha(colors.primary, TINT_ALPHA);

export type WorkoutSetTimed = {
  /** The hold countdown is running (M Workout Set Holding). */
  holding: boolean;
  /** "0:18" while holding. */
  remaining?: string;
  /** ▶ starts the hold, ■ stops it. */
  onHoldPress: () => void;
};

export type WorkoutSetRowProps = {
  /** The set's number in the exercise (1-based). */
  number: number;
  /** "12 reps · Direta", "Até a falha · Falha", "Isometria". */
  target: string;
  /** "Última vez: 20 kg", a trainer's note, "Segurar 30 s". */
  hint?: string;
  /** The weight field's text, pt-BR ("42,5"); `""` is none. */
  weight: string;
  onWeightChange: (text: string) => void;
  done: boolean;
  onToggle: () => void;
  /** The set the client is on (primary ring and disc, M Workout Set Current). */
  current?: boolean;
  /** A set prescribed by duration (M Workout Set Timed / Holding). */
  timed?: WorkoutSetTimed;
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

/**
 * M Workout Set: the set's number disc, its target and hint, the weight box (kg, optional) and
 * the done check. Done turns the row success-tinted (M Workout Set Done); `current` rings it in
 * primary; a timed set adds the hold button (▶ / ■) and, while holding, shows the countdown in
 * place of the target. The weight stays editable after the set is done, until the workout ends.
 */
export function WorkoutSetRow({
  number,
  target,
  hint,
  weight,
  onWeightChange,
  done,
  onToggle,
  current = false,
  timed,
  style,
  testID,
}: WorkoutSetRowProps) {
  const holding = timed?.holding === true;
  const ringed = !done && (current || holding);
  return (
    <View testID={testID} style={[styles.row, done ? styles.rowDone : ringed ? styles.rowCurrent : null, style]}>
      <View style={[styles.disc, done ? styles.discDone : ringed ? styles.discCurrent : null]}>
        <Text variant="label" weight="bold" color={done ? "bg" : ringed ? "primaryText" : "textSecondary"} allowFontScaling={false}>
          {number}
        </Text>
      </View>
      <View style={styles.info}>
        {holding && timed?.remaining !== undefined ? (
          <Text variant="titleSm" color="primary" accessibilityLabel={`Segurando, faltam ${timed.remaining}`}>
            {timed.remaining}
          </Text>
        ) : (
          <Text variant="bodyMdStrong" numberOfLines={1}>
            {target}
          </Text>
        )}
        {hint === undefined ? null : (
          <Text variant="small" color="textTertiary" numberOfLines={1}>
            {hint}
          </Text>
        )}
      </View>
      {timed === undefined ? null : (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={holding ? `Parar a série ${number}` : `Iniciar a série ${number}`}
          onPress={timed.onHoldPress}
          hitSlop={(controls.hitTarget - sizes.workoutSetHold) / 2}
          style={[styles.hold, holding ? styles.holdRunning : null]}
        >
          {holding ? (
            <Square size={14} color={colors.primaryText} fill={colors.primaryText} />
          ) : (
            <Play size={18} color={colors.primary} />
          )}
        </Pressable>
      )}
      <View
        testID={testID === undefined ? undefined : `${testID}-weight`}
        style={[styles.weight, timed === undefined ? null : styles.weightTimed, done ? styles.weightDone : null]}
      >
        <TextInput
          value={weight}
          onChangeText={onWeightChange}
          placeholder="—"
          placeholderTextColor={colors.textTertiary}
          keyboardType="decimal-pad"
          maxLength={6}
          selectTextOnFocus
          maxFontSizeMultiplier={WEIGHT_INPUT_MAX_SCALE}
          accessibilityLabel={`Carga da série ${number}, em quilos`}
          style={styles.weightInput}
        />
        <Text variant="caption" color="textTertiary" accessible={false} maxFontSizeMultiplier={WEIGHT_INPUT_MAX_SCALE}>
          kg
        </Text>
      </View>
      <Pressable
        accessibilityRole="checkbox"
        accessibilityLabel={`Série ${number} feita`}
        accessibilityState={{ checked: done }}
        onPress={onToggle}
        hitSlop={(controls.hitTarget - sizes.workoutSetCheck) / 2}
        style={[styles.check, done ? styles.checkDone : null]}
      >
        {done ? <Check size={20} color={colors.bg} strokeWidth={3} /> : null}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: sizes.workoutSetHeight,
    flexDirection: "row",
    alignItems: "center",
    gap: space[3],
    paddingHorizontal: space[3],
    paddingVertical: space[2],
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  rowDone: { backgroundColor: DONE_FILL, borderColor: DONE_RING },
  rowCurrent: { borderColor: colors.primary, borderWidth: sizes.focusBorderWidth },
  disc: {
    width: sizes.workoutSetDisc,
    height: sizes.workoutSetDisc,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceActive,
    alignItems: "center",
    justifyContent: "center",
  },
  discDone: { backgroundColor: colors.success },
  discCurrent: { backgroundColor: colors.primary },
  info: { flex: 1, gap: sizes.rowLinesGap },
  hold: {
    width: sizes.workoutSetHold,
    height: sizes.workoutSetHold,
    borderRadius: radius.full,
    backgroundColor: HOLD_FILL,
    alignItems: "center",
    justifyContent: "center",
  },
  holdRunning: { backgroundColor: colors.primary },
  weight: {
    minWidth: sizes.workoutSetWeight,
    height: sizes.workoutSetWeightHeight,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: space[1],
    paddingHorizontal: sizes.workoutSetWeightPadding,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bg,
  },
  weightTimed: { minWidth: sizes.workoutSetWeightTimed },
  weightDone: { backgroundColor: "transparent" },
  // Grows with the number ("999,99" is wider than the 84 pt box allows), taking room from the info column.
  weightInput: { ...textStyle("bodyLgStrong"), minWidth: sizes.workoutSetWeightInput, padding: 0, textAlign: "right", color: colors.textPrimary },
  check: {
    width: sizes.workoutSetCheck,
    height: sizes.workoutSetCheck,
    borderRadius: radius.md,
    borderWidth: sizes.checkboxBorderWidth,
    borderColor: colors.borderStrong,
    alignItems: "center",
    justifyContent: "center",
  },
  checkDone: { backgroundColor: colors.success, borderColor: colors.success },
});
