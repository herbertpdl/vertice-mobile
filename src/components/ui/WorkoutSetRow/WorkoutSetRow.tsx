import { Check, ChevronRight, MessageSquareText, Play, Square, Zap } from "lucide-react-native";
import { Pressable, StyleSheet, TextInput, View, type StyleProp, type ViewStyle } from "react-native";

import { colors, controls, radius, sizes, space, textStyle, TINT_ALPHA, WEIGHT_INPUT_MAX_SCALE, withAlpha } from "@/theme";

import { Text } from "../Text";

/** The fill and ring of a done set (M Workout Set Done: success at `0F` and `59`). */
const DONE_FILL = withAlpha(colors.success, 0x0f / 255);
const DONE_RING = withAlpha(colors.success, 0x59 / 255);
const HOLD_FILL = withAlpha(colors.primary, TINT_ALPHA);
/** The strategy panel's fill: secondary (violet) at the badge tint, so it reads apart from the primary ring. */
const STRATEGY_FILL = withAlpha(colors.secondary, TINT_ALPHA);
/** The hairline above a done set's strategy row (success at `33`). */
const DONE_DIVIDER = withAlpha(colors.success, 0x33 / 255);

export type WorkoutSetTimed = {
  /** The hold countdown is running (M Workout Set Holding). */
  holding: boolean;
  /** "0:18" while holding. */
  remaining?: string;
  /** ▶ starts the hold, ■ stops it. */
  onHoldPress: () => void;
};

export type WorkoutSetStrategy = {
  /** "Dropset". */
  name: string;
  /** How to do it: the trainer's description, else the strategy's own. */
  text: string;
  /** `text` is the trainer's ("Orientação do seu treinador"). */
  fromTrainer: boolean;
  /** The explanation shows in the row (the set the client is on); otherwise a "Como fazer" row. */
  expanded: boolean;
  /** Opens the whole explanation. */
  onOpen: () => void;
};

export type WorkoutSetRowProps = {
  /** The set's number in the exercise (1-based). */
  number: number;
  /** "12 reps", "Até a falha", "30 s". */
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
  /** A set whose strategy needs explaining (not a plain "Direta" set without a trainer's note). */
  strategy?: WorkoutSetStrategy;
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

/**
 * M Workout Set: the set's number disc, its target and hint, the weight box (kg, optional) and
 * the done check. Done turns the row success-tinted (M Workout Set Done); `current` rings it in
 * primary; a timed set adds the hold button (▶ / ■) and, while holding, shows the countdown in
 * place of the target. The weight stays editable after the set is done, until the workout ends.
 * A set with a strategy to explain shows it under the row: on the current set the explanation
 * itself (3 lines, "Ver tudo ›"), elsewhere a full-width "Como fazer ›" row; both open the whole
 * explanation.
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
  strategy,
  style,
  testID,
}: WorkoutSetRowProps) {
  const holding = timed?.holding === true;
  const ringed = !done && (current || holding);
  return (
    <View testID={testID} style={[styles.card, done ? styles.cardDone : ringed ? styles.cardCurrent : null, style]}>
      <View testID={testID === undefined ? undefined : `${testID}-row`} style={styles.row}>
        <View style={[styles.disc, done ? styles.discDone : ringed ? styles.discCurrent : null]}>
          <Text variant="label" weight="bold" color={done ? "bg" : ringed ? "primaryText" : "textSecondary"} allowFontScaling={false}>
            {number}
          </Text>
        </View>
        <View style={styles.info}>
          {holding && timed?.remaining !== undefined ? (
            <Text
              variant="titleSm"
              color="primary"
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.7}
              maxFontSizeMultiplier={WEIGHT_INPUT_MAX_SCALE}
              accessibilityLabel={`Segurando, faltam ${timed.remaining}`}
            >
              {timed.remaining}
            </Text>
          ) : (
            <Text variant="bodyMdStrong" numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.8}>
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
      {strategy === undefined ? null : strategy.expanded ? (
        <StrategyPanel strategy={strategy} />
      ) : (
        <StrategyLink strategy={strategy} done={done} />
      )}
    </View>
  );
}

/** The current set's explanation, inline: the client reads it before doing the set. */
function StrategyPanel({ strategy }: { strategy: WorkoutSetStrategy }) {
  return (
    <View style={styles.panel}>
      <View style={styles.panelHead}>
        <Zap size={16} color={colors.secondaryHover} />
        <Text variant="eyebrow" color="secondaryHover">
          {strategy.name.toUpperCase()}
        </Text>
      </View>
      <Text variant="bodyRelaxed" numberOfLines={3}>
        {strategy.text}
      </Text>
      <View style={styles.panelFoot}>
        {strategy.fromTrainer ? (
          <View style={styles.source}>
            <MessageSquareText size={14} color={colors.textSecondary} />
            <Text variant="small" color="textSecondary">
              Orientação do seu treinador
            </Text>
          </View>
        ) : (
          <View />
        )}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${strategy.name}: ver tudo`}
          onPress={strategy.onOpen}
          hitSlop={(controls.hitTarget - sizes.strategyLinkHeight) / 2}
          style={styles.more}
        >
          <Text variant="label" color="secondaryHover">
            Ver tudo
          </Text>
          <ChevronRight size={16} color={colors.secondaryHover} />
        </Pressable>
      </View>
    </View>
  );
}

/** Any other set's strategy: a full-width row that says what it opens. */
function StrategyLink({ strategy, done }: { strategy: WorkoutSetStrategy; done: boolean }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${strategy.name}: como fazer`}
      onPress={strategy.onOpen}
      style={({ pressed }) => [styles.link, done ? styles.linkDone : null, pressed ? styles.linkPressed : null]}
    >
      <Zap size={16} color={colors.secondaryHover} />
      <Text variant="label" color="secondaryHover">
        {strategy.name}
      </Text>
      <Text variant="caption" color="textSecondary" style={styles.flex} numberOfLines={1}>
        · Como fazer
      </Text>
      <ChevronRight size={16} color={colors.textSecondary} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    overflow: "hidden",
  },
  cardDone: { backgroundColor: DONE_FILL, borderColor: DONE_RING },
  cardCurrent: { borderColor: colors.primary, borderWidth: sizes.focusBorderWidth },
  row: {
    minHeight: sizes.workoutSetHeight,
    flexDirection: "row",
    alignItems: "center",
    gap: space[3],
    paddingHorizontal: space[3],
    paddingVertical: space[2],
  },
  flex: { flex: 1 },
  panel: {
    gap: space[2],
    marginHorizontal: space[3],
    marginBottom: space[3],
    padding: space[3],
    borderRadius: radius.sm,
    backgroundColor: STRATEGY_FILL,
  },
  panelHead: { flexDirection: "row", alignItems: "center", gap: space[2] },
  panelFoot: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: space[2] },
  source: { flexDirection: "row", alignItems: "center", gap: space[1], flexShrink: 1 },
  more: { flexDirection: "row", alignItems: "center", height: sizes.strategyLinkHeight, paddingLeft: space[2] },
  link: {
    minHeight: controls.hitTarget,
    flexDirection: "row",
    alignItems: "center",
    gap: space[2],
    paddingHorizontal: space[3],
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  linkDone: { borderTopColor: DONE_DIVIDER },
  linkPressed: { backgroundColor: colors.surfaceHover },
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
