import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { StyleSheet } from "react-native";

import { FormTextField } from "@/components/form";
import { NavBar, Screen } from "@/components/layout";
import { Banner, Button, StatusBanner, Text } from "@/components/ui";
import { changePassword } from "@/lib/api/auth";
import { ApiError } from "@/lib/api/client";
import { apiErrorMessage } from "@/lib/api/errorMessages";
import { rateLimitedMessage } from "@/lib/api/rateLimit";
import { useAuth } from "@/lib/auth";
import { useIsOffline } from "@/lib/network";
import { useSingleFlight } from "@/lib/useSingleFlight";
import { PASSWORD_HELP_TEXT } from "@/lib/validation/auth";
import { changePasswordSchema, type ChangePasswordInput } from "@/lib/validation/profile";
import { space } from "@/theme";

/**
 * M - Alterar Senha: current, new and confirmation (`POST /api/auth/password`, the platform's
 * password policy). A wrong current password is a field error, not a sign-out. A successful change
 * ends every session of the account, this phone's included (PRD R9, R10), so the app signs out at
 * once — keeping drafts and the workout outbox like any session that ended by itself (R16) — and the
 * login screen asks for the new password (mobile-persistent-session spec §3).
 */
export function ChangePasswordScreen() {
  const { signOut } = useAuth();
  const offline = useIsOffline();
  const {
    control,
    handleSubmit,
    setError,
    setFocus,
    formState: { isSubmitting },
  } = useForm<ChangePasswordInput>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: { currentPassword: "", newPassword: "", confirmPassword: "" },
  });

  const save = useMutation({
    mutationFn: (input: { currentPassword: string; newPassword: string }) => changePassword(input),
    // The passwords are this mutation's variables: drop them from the cache as soon as it settles.
    gcTime: 0,
    // Signing out unmounts this screen (`Stack.Protected`) and lands on the login screen with
    // "Senha alterada. Entre com a nova senha.". A failure deleting the stored token is harmless
    // here: vertice-api already voided it, so the next launch's first call signs out anyway.
    onSuccess: () => signOut("passwordChanged").catch(() => {}),
    onError: (error) => {
      if (error instanceof ApiError && error.code === "INVALID_CURRENT_PASSWORD") {
        setError("currentPassword", { message: "Senha atual incorreta." }, { shouldFocus: true });
      }
    },
  });
  const busy = isSubmitting || save.isPending;
  const submit = useSingleFlight(handleSubmit(({ currentPassword, newPassword }) => save.mutateAsync({ currentPassword, newPassword }).catch(() => {})));
  const failure =
    save.error instanceof ApiError && save.error.code === "INVALID_CURRENT_PASSWORD"
      ? null
      : save.isError
        ? (rateLimitedMessage(save.error, "Muitas tentativas.") ?? apiErrorMessage(save.error, "Não foi possível alterar a senha"))
        : null;

  return (
    <Screen
      header={
        <>
          <NavBar title="Alterar senha" />
          {offline ? <StatusBanner kind="offline" /> : null}
        </>
      }
      contentStyle={styles.content}
      footer={<Button label="Salvar nova senha" loading={busy} onPress={() => void submit()} />}
    >
      <Text variant="body" color="textSecondary">
        Ao salvar, você sai do app em todos os aparelhos e entra de novo com a nova senha.
      </Text>
      {failure === null ? null : <Banner message={failure} />}
      <FormTextField
        control={control}
        name="currentPassword"
        label="Senha atual"
        password
        autoComplete="current-password"
        textContentType="password"
        returnKeyType="next"
        onSubmitEditing={() => setFocus("newPassword")}
      />
      <FormTextField
        control={control}
        name="newPassword"
        label="Nova senha"
        password
        autoComplete="new-password"
        textContentType="newPassword"
        help={PASSWORD_HELP_TEXT}
        returnKeyType="next"
        onSubmitEditing={() => setFocus("confirmPassword")}
      />
      <FormTextField
        control={control}
        name="confirmPassword"
        label="Confirmar nova senha"
        password
        autoComplete="new-password"
        textContentType="newPassword"
        returnKeyType="done"
        onSubmitEditing={() => void submit()}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingTop: space[2], gap: space[5] },
});
