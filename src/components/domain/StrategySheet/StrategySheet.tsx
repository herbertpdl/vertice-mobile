import { MessageSquareText, X } from "lucide-react-native";
import { ScrollView, StyleSheet, View } from "react-native";

import { Button, IconButton, SheetModal, Text } from "@/components/ui";
import type { StrategyGuide } from "@/lib/workoutText";
import { colors, space } from "@/theme";

export type StrategySheetProps = {
  visible: boolean;
  onClose: () => void;
  /** The set it explains (its eyebrow, "SÉRIE 4 · ESTRATÉGIA"). */
  setNumber: number;
  /** Kept while the sheet animates out, so it doesn't empty mid-close. */
  guide: StrategyGuide | null;
};

/**
 * A - Estratégia (Sheet): what a set's strategy asks of the client, opened from its "Como fazer"
 * row or "Ver tudo". The trainer's own description replaces the strategy's, and says so.
 */
export function StrategySheet({ visible, onClose, setNumber, guide }: StrategySheetProps) {
  return (
    <SheetModal visible={visible} onClose={onClose} accessibilityLabel={guide?.name ?? "Estratégia"}>
      <View style={styles.head}>
        <View style={styles.title}>
          <Text variant="eyebrow" color="textSecondary">
            {`SÉRIE ${setNumber} · ESTRATÉGIA`}
          </Text>
          <Text variant="titleSm" accessibilityRole="header">
            {guide?.name ?? ""}
          </Text>
        </View>
        <IconButton icon={X} variant="plain" color="textSecondary" iconSize={20} accessibilityLabel="Fechar" onPress={onClose} />
      </View>
      <ScrollView style={styles.scroll} bounces={false}>
        <View style={styles.body}>
          <Text variant="bodyMdRelaxed">{guide?.text ?? ""}</Text>
          {guide?.fromTrainer === true ? (
            <View style={styles.source}>
              <MessageSquareText size={14} color={colors.textSecondary} />
              <Text variant="caption" color="textSecondary">
                Orientação do seu treinador
              </Text>
            </View>
          ) : null}
        </View>
      </ScrollView>
      <Button label="Entendi" onPress={onClose} />
    </SheetModal>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: "row", alignItems: "center", gap: space[3] },
  title: { flex: 1, gap: space[1] },
  scroll: { flexGrow: 0 },
  body: { gap: space[3] },
  source: { flexDirection: "row", alignItems: "center", gap: space[2] },
});
