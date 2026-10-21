import { CloudOff, type LucideIcon } from "lucide-react-native";
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";

import { colors, radius, sizes, space } from "@/theme";

import { Button } from "../Button";
import { Text } from "../Text";

export type EmptyStateProps = {
  icon: LucideIcon;
  title: string;
  message?: string;
  /** The M Button Secondary under the text ("Limpar busca", "Novo aluno"). */
  action?: { label: string; onPress: () => void; loading?: boolean };
  style?: StyleProp<ViewStyle>;
};

/**
 * M Empty State: a 72 pt `surface` disc with a 30 pt tertiary glyph, a 17/600 title, a centered
 * secondary message and an optional secondary button.
 */
export function EmptyState({ icon: Icon, title, message, action, style }: EmptyStateProps) {
  return (
    <View style={[styles.root, style]}>
      <View style={styles.disc}>
        <Icon size={sizes.emptyIcon} color={colors.textTertiary} />
      </View>
      <Text variant="navTitle" align="center" accessibilityRole="header">
        {title}
      </Text>
      {message === undefined ? null : (
        <Text variant="bodyRelaxed" color="textSecondary" align="center">
          {message}
        </Text>
      )}
      {action === undefined ? null : (
        <Button
          variant="secondary"
          label={action.label}
          onPress={action.onPress}
          loading={action.loading}
          style={styles.button}
        />
      )}
    </View>
  );
}

export type ErrorStateProps = {
  onRetry: () => void;
  retrying?: boolean;
  title?: string;
  message?: string;
  style?: StyleProp<ViewStyle>;
};

/** M - Erro (Tela): the full-screen load failure, built from M Empty State. */
export function ErrorState({
  onRetry,
  retrying = false,
  title = "Algo deu errado",
  message = "Não foi possível carregar as informações. Verifique sua conexão e tente novamente.",
  style,
}: ErrorStateProps) {
  return (
    <EmptyState
      icon={CloudOff}
      title={title}
      message={message}
      action={{ label: "Tentar novamente", onPress: onRetry, loading: retrying }}
      style={style}
    />
  );
}

const styles = StyleSheet.create({
  root: {
    alignItems: "center",
    gap: space[4],
    paddingVertical: space[12],
    paddingHorizontal: space[6],
  },
  disc: {
    width: sizes.emptyDisc,
    height: sizes.emptyDisc,
    borderRadius: radius.full,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  button: { minWidth: sizes.emptyButtonMinWidth },
});
