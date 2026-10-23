import { StyleSheet, View } from "react-native";

import { Button, ExerciseStepRow, Sheet, Text } from "@/components/ui";
import type { StepRow } from "@/lib/workoutSession/engine";
import { space } from "@/theme";

export type ExerciseListSheetProps = {
  visible: boolean;
  onClose: () => void;
  steps: StepRow[];
  onPick: (index: number) => void;
  onFinish: () => void;
  /** iOS only: the sheet finished animating out (open a dialog from here, see `ActionSheet`). */
  onDismiss?: () => void;
};

/** "4 de 4 séries" / "Em andamento · 2 de 4 séries" / "0 de 3 séries". */
export function stepMeta(step: StepRow): string {
  const sets = `${step.done} de ${step.total} ${step.total === 1 ? "série" : "séries"}`;
  return step.state === "current" ? `Em andamento · ${sets}` : sets;
}

/**
 * A - Todos os Exercícios (Sheet): every exercise with its sets progress, any one opens (R41), and
 * "Finalizar treino" is always here, sets left or not (R42).
 */
export function ExerciseListSheet({ visible, onClose, steps, onPick, onFinish, onDismiss }: ExerciseListSheetProps) {
  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      onDismiss={onDismiss}
      title="Exercícios do treino"
      footer={
        <View style={styles.footer}>
          <Button label="Finalizar treino" variant="secondary" onPress={onFinish} />
          <Text variant="small" color="textTertiary" align="center">
            Você pode finalizar a qualquer momento. Séries não marcadas não são registradas.
          </Text>
        </View>
      }
    >
      <View style={styles.list}>
        {steps.map((step) => (
          <ExerciseStepRow
            key={step.index}
            index={step.index + 1}
            name={step.name}
            meta={stepMeta(step)}
            state={step.state}
            onPress={() => onPick(step.index)}
          />
        ))}
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  list: { gap: space[2] },
  footer: { flex: 1, gap: space[2] },
});
