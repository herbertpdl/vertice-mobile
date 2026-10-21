import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { router } from "expo-router";
import { useForm } from "react-hook-form";
import { StyleSheet } from "react-native";

import { FormTextField } from "@/components/form";
import { NavBar, Screen } from "@/components/layout";
import { Banner, Button, StatusBanner, Text, useToast } from "@/components/ui";
import { changePassword } from "@/lib/api/auth";
import { ApiError } from "@/lib/api/client";
import { apiErrorMessage } from "@/lib/api/errorMessages";
import { rateLimitedMessage } from "@/lib/api/rateLimit";
import { useIsOffline } from "@/lib/network";
import { useSingleFlight } from "@/lib/useSingleFlight";
import { PASSWORD_HELP_TEXT } from "@/lib/validation/auth";
import { changePasswordSchema, type ChangePasswordInput } from "@/lib/validation/profile";
import { space } from "@/theme";

/**
 * M - Alterar Senha: current, new and confirmation (`POST /api/auth/password`, the platform's
 * password policy). A wrong current password is a field error, not a sign-out; the session on
 * this device stays valid after the change.
 */
export function ChangePasswordScreen() {
  const toast = useToast();
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
    onSuccess: () => {
      if (router.canGoBack()) router.back();
      else router.replace("/perfil");
      toast.show("Senha alterada.");
    },
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
        Após salvar, você continua conectado neste aparelho.
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
