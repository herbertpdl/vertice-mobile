import { router } from "expo-router";
import { ChevronLeft, type LucideIcon } from "lucide-react-native";
import { StyleSheet, View } from "react-native";

import { IconButton } from "@/components/ui/IconButton";
import { Text } from "@/components/ui/Text";
import { controls, space } from "@/theme";

export type NavBarAction = {
  icon: LucideIcon;
  accessibilityLabel: string;
  onPress: () => void;
};

export type NavBarProps = {
  title: string;
  /** Back handler; defaults to `router.back()`. Pass `null` for a screen with no way back. */
  onBack?: (() => void) | null;
  /** The right-hand button (⋮, pencil). */
  action?: NavBarAction;
};

/**
 * M Nav Bar: 44 pt back chevron (26), centered 17/600 title, 44 pt action (22, secondary). The
 * sides are always 44 wide so the title stays centered with or without them.
 */
export function NavBar({ title, onBack, action }: NavBarProps) {
  return (
    <View style={styles.bar}>
      {onBack === null ? (
        <View style={styles.side} />
      ) : (
        <IconButton
          icon={ChevronLeft}
          variant="plain"
          iconSize={26}
          accessibilityLabel="Voltar"
          onPress={onBack ?? (() => router.back())}
        />
      )}
      <Text variant="navTitle" align="center" numberOfLines={1} style={styles.title} accessibilityRole="header">
        {title}
      </Text>
      {action === undefined ? (
        <View style={styles.side} />
      ) : (
        <IconButton
          icon={action.icon}
          variant="plain"
          color="textSecondary"
          accessibilityLabel={action.accessibilityLabel}
          onPress={action.onPress}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: space[2],
    paddingVertical: controls.navBarPaddingVertical,
  },
  side: { width: controls.hitTarget, height: controls.hitTarget },
  title: { flex: 1 },
});
