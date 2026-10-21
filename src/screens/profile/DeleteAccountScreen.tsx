import { useMutation } from "@tanstack/react-query";
import { router } from "expo-router";
import { TriangleAlert } from "lucide-react-native";
import { useState } from "react";
import { StyleSheet, View } from "react-native";

import { NavBar, Screen } from "@/components/layout";
import { Banner, Button, StatusBanner, Text, TextField, TextLink, useToast } from "@/components/ui";
import { deleteAccount } from "@/lib/api/auth";
import { ApiError } from "@/lib/api/client";
import { apiErrorMessage, errorMessages } from "@/lib/api/errorMessages";
import { rateLimitedMessage } from "@/lib/api/rateLimit";
import { useAuth } from "@/lib/auth";
import { useIsOffline } from "@/lib/network";
import { useSingleFlight } from "@/lib/useSingleFlight";
import { colors, radius, sizes, space, TINT_ALPHA, withAlpha } from "@/theme";

const CONSEQUENCES = [
  "Seus dados pessoais e de acesso serão removidos.",
  "Planos, treinos e exercícios criados por você serão excluídos.",
  "Seus alunos perderão acesso aos treinos.",
];

/**
 * M - Excluir Conta (+ Alunos ativos): what deleting means, the password as confirmation,
 * `DELETE /api/auth/me`. A wrong password is a field error; 409 `ACTIVE_CLIENTS` (a trainer with
 * students still linked) a banner above. Once deleted, every token of the account is dead: sign out.
 */
export function DeleteAccountScreen() {
  const { signOut } = useAuth();
  const toast = useToast();
  const offline = useIsOffline();
  const [password, setPassword] = useState("");

  const remove = useMutation({
    mutationFn: () => deleteAccount(password),
    onSuccess: async () => {
      await signOut("user");
      toast.show("Conta excluída.");
    },
  });
  const submit = useSingleFlight(() => remove.mutateAsync().catch(() => {}));
  const code = remove.error instanceof ApiError ? remove.error.code : null;
  const passwordError = code === "INVALID_CURRENT_PASSWORD" ? "Senha incorreta." : undefined;
  const banner =
    code === "ACTIVE_CLIENTS"
      ? errorMessages.ACTIVE_CLIENTS!
      : remove.isError && passwordError === undefined
        ? (rateLimitedMessage(remove.error, "Muitas tentativas com senha incorreta.") ??
          apiErrorMessage(remove.error, "Não foi possível excluir a conta. Tente novamente."))
        : null;

  return (
    <Screen
      header={
        <>
          <NavBar title="Excluir conta" />
          {offline ? <StatusBanner kind="offline" /> : null}
        </>
      }
      contentStyle={styles.content}
      footer={
        <View style={styles.footer}>
          <Button
            label="Excluir minha conta"
            variant="danger"
            disabled={password === ""}
            loading={remove.isPending}
            onPress={() => void submit()}
          />
          <TextLink label="Cancelar" style={styles.cancel} disabled={remove.isPending} onPress={() => router.back()} />
        </View>
      }
    >
      {banner === null ? null : <Banner message={banner} />}
      <View style={styles.card}>
        <View style={styles.cardHead}>
          <View style={styles.icon}>
            <TriangleAlert size={20} color={colors.danger} />
          </View>
          <Text variant="headingSm" accessibilityRole="header" style={styles.flex}>
            Esta ação é permanente
          </Text>
        </View>
        {CONSEQUENCES.map((line) => (
          <View key={line} style={styles.bullet}>
            <View style={styles.dot} />
            <Text variant="body" color="textSecondary" style={styles.flex}>
              {line}
            </Text>
          </View>
        ))}
      </View>
      <TextField
        label="Confirme sua senha"
        value={password}
        onChangeText={(text) => {
          setPassword(text);
          if (passwordError !== undefined) remove.reset();
        }}
        password
        autoComplete="current-password"
        textContentType="password"
        error={passwordError}
        returnKeyType="done"
        onSubmitEditing={() => {
          if (password !== "") void submit();
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingTop: space[2], gap: space[5] },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: space[4],
    gap: space[3],
  },
  cardHead: { flexDirection: "row", alignItems: "center", gap: space[3] },
  icon: {
    width: sizes.noticeIcon,
    height: sizes.noticeIcon,
    borderRadius: radius.full,
    backgroundColor: withAlpha(colors.danger, TINT_ALPHA),
    alignItems: "center",
    justifyContent: "center",
  },
  bullet: { flexDirection: "row", alignItems: "flex-start", gap: space[3] },
  dot: { width: sizes.bulletDot, height: sizes.bulletDot, borderRadius: radius.full, backgroundColor: colors.textTertiary, marginTop: space[2] },
  footer: { gap: space[2] },
  cancel: { alignSelf: "center" },
  flex: { flex: 1 },
});
