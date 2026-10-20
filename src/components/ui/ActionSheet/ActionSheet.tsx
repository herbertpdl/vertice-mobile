import type { LucideIcon } from "lucide-react-native";
import { useRef } from "react";
import { Platform, StyleSheet, View } from "react-native";

import { colors, radius, space } from "@/theme";

import { Button } from "../Button";
import { ListRow } from "../ListRow";
import { SheetModal } from "../Sheet";
import { Text } from "../Text";

export type SheetAction = {
  icon: LucideIcon;
  label: string;
  onPress: () => void;
  /** Destructive (M List Row Danger); conventionally the last action. */
  danger?: boolean;
};

export type ActionSheetProps = {
  visible: boolean;
  onClose: () => void;
  /** What the actions apply to ("Marina Costa"), centered above them. */
  title: string;
  actions: SheetAction[];
};

/**
 * M Action Sheet: the ⋮ menu. A centered 13/600 title, the actions as one rounded group of
 * M List Rows, and a Cancelar button. Choosing an action closes the sheet first, then runs it —
 * on iOS only once the sheet has finished dismissing (`onDismiss`), because UIKit won't present
 * another modal (a confirm dialog, a form sheet) while one is still animating out.
 */
export function ActionSheet({ visible, onClose, title, actions }: ActionSheetProps) {
  const pending = useRef<(() => void) | null>(null);

  const choose = (run: () => void) => {
    onClose();
    if (Platform.OS === "ios") pending.current = run;
    else run();
  };

  return (
    <SheetModal
      visible={visible}
      onClose={onClose}
      accessibilityLabel={title}
      gap={space[3]}
      onDismiss={() => {
        const run = pending.current;
        pending.current = null;
        run?.();
      }}
    >
      <Text variant="label" color="textSecondary" align="center">
        {title}
      </Text>
      <View style={styles.group}>
        {actions.map((action, index) => (
          <ListRow
            key={action.label}
            icon={action.icon}
            label={action.label}
            danger={action.danger}
            last={index === actions.length - 1}
            onPress={() => choose(action.onPress)}
          />
        ))}
      </View>
      <Button variant="secondary" label="Cancelar" onPress={onClose} />
    </SheetModal>
  );
}

const styles = StyleSheet.create({
  group: {
    borderRadius: radius.lg,
    overflow: "hidden",
    backgroundColor: colors.surface,
  },
});
