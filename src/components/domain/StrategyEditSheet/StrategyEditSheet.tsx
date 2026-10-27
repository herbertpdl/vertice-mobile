import { useState } from "react";
import { StyleSheet, View } from "react-native";

import { Button, Chip, Sheet, Text, TextArea } from "@/components/ui";
import type { SetStrategy } from "@/lib/api/types";
import { SET_STRATEGIES, SET_STRATEGY_DESCRIPTIONS } from "@/lib/labels";
import { NOTES_MAX } from "@/lib/validation/bounds";
import { colors, radius, space } from "@/theme";

const STRATEGY_ORDER = Object.keys(SET_STRATEGIES) as SetStrategy[];

export type StrategyEditSheetProps = {
  visible: boolean;
  onClose: () => void;
  /** 1-based position, for the title ("Série 2"). */
  number: number;
  strategy: SetStrategy;
  /** The set's notes: the description the client sees in place of the strategy's own. */
  notes: string;
  /** "Concluir": the chosen strategy and the description ("" for none). */
  onDone: (strategy: SetStrategy, notes: string) => void;
};

/**
 * M - Estratégia da série (Sheet): the set's strategy and the description the client reads for it
 * during the workout. Empty, the client sees the strategy's own description, shown underneath so
 * the trainer knows what they would replace. Nothing changes until "Concluir". Mount it with a
 * `key` per opening so it starts from the set's current values.
 */
export function StrategyEditSheet({ visible, onClose, number, strategy, notes, onDone }: StrategyEditSheetProps) {
  const [chosen, setChosen] = useState(strategy);
  const [text, setText] = useState(notes);
  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title={`Série ${number}`}
      footer={<Button label="Concluir" style={styles.flex} onPress={() => onDone(chosen, text.trim())} />}
    >
      <View style={styles.field}>
        <Text variant="label" color="textSecondary">
          Estratégia
        </Text>
        <View style={styles.chips} accessibilityRole="radiogroup">
          {STRATEGY_ORDER.map((value) => (
            <Chip key={value} label={SET_STRATEGIES[value]} selected={value === chosen} onPress={() => setChosen(value)} />
          ))}
        </View>
      </View>
      <TextArea
        label="Descrição da estratégia (opcional)"
        value={text}
        onChangeText={setText}
        maxLength={NOTES_MAX}
        placeholder="Como o aluno deve fazer esta série"
        help="O aluno vê esta descrição no lugar da padrão."
      />
      <View style={styles.standard}>
        <Text variant="eyebrow" color="textSecondary">
          DESCRIÇÃO PADRÃO
        </Text>
        <Text variant="caption" color="textSecondary">
          {SET_STRATEGY_DESCRIPTIONS[chosen]}
        </Text>
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  field: { gap: space[2] },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: space[2] },
  standard: { gap: space[1], padding: space[3], borderRadius: radius.md, backgroundColor: colors.bg },
});
