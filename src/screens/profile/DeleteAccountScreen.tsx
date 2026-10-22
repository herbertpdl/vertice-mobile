import { useMutation, useQueryClient } from "@tanstack/react-query";
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
import { useAuth, useMe, useProfileHome } from "@/lib/auth";
import { useIsOffline } from "@/lib/network";
import { useSingleFlight } from "@/lib/useSingleFlight";
import { colors, radius, sizes, SOFT_TINT_ALPHA, space, TINT_ALPHA, withAlpha } from "@/theme";

/** What deletion does (vertice-api's `AccountDeletionService`), in the web dialog's words. */
const CONSEQUENCES = [
  "Seus registros de treino, feedbacks e os planos feitos para você serão apagados.",
  "Seus vínculos com treinadores e alunos serão encerrados e seus dados pessoais serão anonimizados.",
  "Os planos que você escreveu para seus alunos continuam com eles.",
];

/** The lines that apply to an account: a client wrote no plans for anyone. */
export function consequencesFor(role: string | undefined): string[] {
  return role === "CLIENT" ? CONSEQUENCES.slice(0, 2) : CONSEQUENCES;
}

/** Typed to confirm, as on the web: a password alone is one autofill away. */
export const DELETE_CONFIRMATION_PHRASE = "EXCLUIR";

/**
 * M - Excluir Conta (+ Alunos ativos): what deleting means, the password as confirmation,
 * `DELETE /api/auth/me`. A wrong password is a field error; 409 `ACTIVE_CLIENTS` (a trainer with
 * students still linked) a banner above. Once deleted, every token of the account is dead: sign out.
 */
export function DeleteAccountScreen() {
  const { signOut } = useAuth();
  const { data: me } = useMe();
  const profileHome = useProfileHome();
  const toast = useToast();
  const offline = useIsOffline();
  const queryClient = useQueryClient();
  const [phrase, setPhrase] = useState("");
  const [password, setPassword] = useState("");
  const confirmed = phrase.trim() === DELETE_CONFIRMATION_PHRASE && password !== "";

  const remove = useMutation({
    mutationFn: async () => {
      // Nothing else in flight: once the account is gone its token 401s, and a refetch landing
      // first would sign out as "session expired" instead of as a deliberate exit.
      await queryClient.cancelQueries();
      await deleteAccount(password);
    },
    gcTime: 0,
    onSuccess: async () => {
      await signOut("user");
      toast.show("Conta excluída.");
    },
  });
  const submit = useSingleFlight(() => remove.mutateAsync().catch(() => {}));
  const code = remove.error instanceof ApiError ? remove.error.code : null;
  const passwordError = code === "INVALID_CURRENT_PASSWORD" ? "Senha incorreta." : undefined;
  const activeClients = code === "ACTIVE_CLIENTS";
  const banner =
    activeClients || passwordError !== undefined
      ? null
      : remove.isError
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
            disabled={!confirmed}
            loading={remove.isPending}
            onPress={() => void submit()}
          />
          <TextLink
            label="Cancelar"
            style={styles.cancel}
            disabled={remove.isPending}
            onPress={() => (router.canGoBack() ? router.back() : router.replace(profileHome))}
          />
        </View>
      }
    >
      {activeClients ? (
        <View style={styles.active} accessibilityRole="alert">
          <Text variant="bodyStrong" color="danger">
            Você ainda tem alunos ativos
          </Text>
          <Text variant="body" color="textPrimary">
            {errorMessages.ACTIVE_CLIENTS}
          </Text>
          <TextLink label="Ver alunos" onPress={() => router.navigate("/alunos")} />
        </View>
      ) : null}
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
        {consequencesFor(me?.role).map((line) => (
          <View key={line} style={styles.bullet}>
            <View style={styles.dot} />
            <Text variant="body" color="textSecondary" style={styles.flex}>
              {line}
            </Text>
          </View>
        ))}
      </View>
      <TextField
        label={`Digite ${DELETE_CONFIRMATION_PHRASE} para confirmar`}
        value={phrase}
        onChangeText={setPhrase}
        autoCapitalize="characters"
        autoCorrect={false}
        autoComplete="off"
      />
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
          if (confirmed) void submit();
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
    width: sizes.deleteNoticeIcon,
    height: sizes.deleteNoticeIcon,
    borderRadius: radius.full,
    backgroundColor: withAlpha(colors.danger, TINT_ALPHA),
    alignItems: "center",
    justifyContent: "center",
  },
  bullet: { flexDirection: "row", alignItems: "flex-start", gap: space[3] },
  dot: { width: sizes.deleteNoticeBullet, height: sizes.deleteNoticeBullet, borderRadius: radius.full, backgroundColor: colors.textTertiary, marginTop: space[2] },
  footer: { gap: space[2] },
  cancel: { alignSelf: "center" },
  active: {
    gap: space[1],
    padding: sizes.bannerPadding,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.danger,
    backgroundColor: withAlpha(colors.danger, SOFT_TINT_ALPHA),
  },
  flex: { flex: 1 },
});
