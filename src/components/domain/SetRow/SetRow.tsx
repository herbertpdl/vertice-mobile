import { useState } from "react";
import { Pressable, StyleSheet, TextInput, View } from "react-native";

import { Text } from "@/components/ui/Text";
import { REPS_MAX, REST_SECONDS_MAX } from "@/lib/validation/bounds";
import type { EditorSet, SetFields } from "@/lib/workoutEditor/model";
import { colors, controls, radius, sizes, space, textStyle } from "@/theme";

// What may be typed (anything else marks the cell invalid) vs. what is committed: a lone or
// trailing separator ("." / "6,") is a keystroke away from a number, so it is neither flagged nor
// committed — committing it would send a value the platform rejects (the web's `SetRow` rules).
const DECIMAL = /^\d*([.,]\d*)?$/;
const COMPLETE_DECIMAL = /^(\d+([.,]\d+)?|[.,]\d+)$/;
const INTEGER = /^\d*$/;

/** What the platform stores (vertice-api): weight `NUMERIC(6,2)`, reps/rest capped. */
type Bounds = { max: number } | { intDigits: number; decDigits: number };
const WEIGHT_BOUNDS: Bounds = { intDigits: 4, decDigits: 2 };

function withinBounds(text: string, bounds: Bounds): boolean {
  if ("max" in bounds) return text === "" || Number(text) <= bounds.max;
  const [int = "", dec = ""] = text.replace(",", ".").split(".");
  return int.replace(/^0+(?=\d)/, "").length <= bounds.intDigits && dec.length <= bounds.decDigits;
}

/** Wire form of a complete decimal: dot separator, leading zero. */
function toWireDecimal(text: string): string {
  const dotted = text.replace(",", ".");
  return dotted.startsWith(".") ? `0${dotted}` : dotted;
}

/** pt-BR display of a wire decimal ("42.5" → "42,5"). */
function toDisplayDecimal(wire: string): string {
  return wire.replace(".", ",");
}

type CellProps = {
  /** The committed value, display form ("" = unset). */
  value: string;
  onCommit: (value: string) => void;
  kind: "integer" | "decimal";
  bounds: Bounds;
  /** Shown after the value while the cell isn't being edited ("kg", "s"). */
  unit?: string;
  accessibilityLabel: string;
  editable: boolean;
};

function Cell({ value, onCommit, kind, bounds, unit, accessibilityLabel, editable }: CellProps) {
  const [local, setLocal] = useState(value);
  const [lastValue, setLastValue] = useState(value);
  const [focused, setFocused] = useState(false);
  // Re-sync when the draft changes underneath (a discard, a refused removal restored).
  if (value !== lastValue) {
    setLastValue(value);
    setLocal(value);
  }
  const pattern = kind === "integer" ? INTEGER : DECIMAL;
  const valid = pattern.test(local) && withinBounds(local, bounds);
  const shown = focused || local === "" || unit === undefined ? local : `${local} ${unit}`;

  return (
    <TextInput
      value={shown}
      placeholder="—"
      placeholderTextColor={colors.textTertiary}
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={valid ? undefined : "Valor inválido"}
      keyboardType={kind === "integer" ? "number-pad" : "decimal-pad"}
      editable={editable}
      selectTextOnFocus
      onFocus={() => setFocused(true)}
      onChangeText={(next) => {
        setLocal(next);
        // Out of range is flagged and never committed.
        if (!pattern.test(next) || !withinBounds(next, bounds)) return;
        if (kind === "integer" || next === "") onCommit(next);
        else if (COMPLETE_DECIMAL.test(next)) onCommit(toWireDecimal(next));
      }}
      onBlur={() => {
        setFocused(false);
        // Left invalid or on a dangling separator: show what was actually committed.
        if (!valid || (kind === "decimal" && local !== "" && !COMPLETE_DECIMAL.test(local))) setLocal(value);
      }}
      style={[styles.cell, valid ? null : styles.invalid]}
    />
  );
}

export type SetRowProps = {
  set: EditorSet;
  /** 1-based position. */
  number: number;
  onUpdate: (patch: Partial<SetFields>) => void;
  /** The number cell opens the set's actions (duplicate, move, remove). */
  onOptions: () => void;
  /** A removal of this set was refused and undone: drawn in warning. */
  refused?: boolean;
  disabled?: boolean;
};

/**
 * M Set Row: the set's number, then reps, load (kg) and rest (s) cells — 44 pt tall `bg` boxes,
 * 14/600 centered. The web's row also edits strategy, duration and load %; the phone keeps the
 * three columns of the design and carries the others unchanged. A cell commits as it's typed
 * when the text is a complete value within the platform's bounds (the web's rules); anything
 * else turns the cell's border danger and is never sent.
 */
export function SetRow({ set, number, onUpdate, onOptions, refused = false, disabled = false }: SetRowProps) {
  const editable = !disabled;
  return (
    <View style={styles.row}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Opções da série ${number}`}
        disabled={disabled}
        onPress={onOptions}
        hitSlop={{ top: 0, bottom: 0, left: space[2], right: 0 }}
        style={styles.number}
      >
        <Text variant="bodyStrong" color={refused ? "warning" : "textSecondary"}>
          {number}
        </Text>
      </Pressable>
      <Cell
        value={set.reps === undefined ? "" : String(set.reps)}
        onCommit={(v) => onUpdate({ reps: v === "" ? undefined : Number(v) })}
        kind="integer"
        bounds={{ max: REPS_MAX }}
        accessibilityLabel={`Repetições da série ${number}`}
        editable={editable}
      />
      <Cell
        value={set.weight === undefined ? "" : toDisplayDecimal(set.weight)}
        onCommit={(v) => onUpdate({ weight: v === "" ? undefined : v })}
        kind="decimal"
        bounds={WEIGHT_BOUNDS}
        unit="kg"
        accessibilityLabel={`Carga da série ${number}, em quilos`}
        editable={editable}
      />
      <Cell
        value={set.restSeconds === undefined ? "" : String(set.restSeconds)}
        onCommit={(v) => onUpdate({ restSeconds: v === "" ? undefined : Number(v) })}
        kind="integer"
        bounds={{ max: REST_SECONDS_MAX }}
        unit="s"
        accessibilityLabel={`Descanso da série ${number}, em segundos`}
        editable={editable}
      />
    </View>
  );
}

/** M Set Header: the column titles above the rows. */
export function SetHeader() {
  return (
    <View style={styles.row} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Text variant="smallStrong" color="textSecondary" style={styles.numberHead}>
        SÉRIE
      </Text>
      {["REPS", "CARGA (KG)", "DESCANSO"].map((label) => (
        <Text key={label} variant="smallStrong" color="textSecondary" align="center" style={styles.flex} numberOfLines={1}>
          {label}
        </Text>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: space[2] },
  number: { width: sizes.setNumberColumn, height: controls.hitTarget, justifyContent: "center" },
  numberHead: { width: sizes.setNumberColumn },
  flex: { flex: 1 },
  cell: {
    ...textStyle("bodyStrong"),
    flex: 1,
    minWidth: 0,
    height: controls.hitTarget,
    backgroundColor: colors.bg,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.textPrimary,
    textAlign: "center",
    paddingHorizontal: space[1],
  },
  invalid: { borderColor: colors.danger },
});
