import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { StyleSheet, View } from "react-native";

import { FormTextField } from "@/components/form";
import { NavBar } from "@/components/layout/NavBar";
import { Screen } from "@/components/layout/Screen";
import { AuthFooter } from "@/components/domain";
import { Banner, Button, Checkbox, InlineLink, Text } from "@/components/ui";
import { register } from "@/lib/api/auth";
import { apiErrorMessage } from "@/lib/api/errorMessages";
import { legalVersionsQuery } from "@/lib/api/legal";
import { useAuth } from "@/lib/auth";
import { openLegalPage } from "@/lib/legal";
import { maskCpf } from "@/lib/masks/cpf";
import { PASSWORD_HELP_TEXT, registerSchema, type RegisterInput } from "@/lib/validation/auth";
import { onlyDigits } from "@/lib/validation/cpf";
import { space } from "@/theme";

/** M - Cadastro / M - Cadastro (Erros de Validação): trainer self-sign-up. */
export function RegisterScreen() {
  const { signIn } = useAuth();
  const [formError, setFormError] = useState<string | null>(null);
  // The version accepted is the BFF's current one: the app links to the web's live texts. Loaded
  // up front so submitting doesn't wait on it; `fetchQuery` below reuses it (or retries it).
  const queryClient = useQueryClient();
  useQuery(legalVersionsQuery);
  const {
    control,
    handleSubmit,
    setFocus,
    formState: { isSubmitting, errors, submitCount },
  } = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    // `terms` starts unset (unchecked); the schema only accepts `true`.
    defaultValues: { name: "", email: "", cpf: "", password: "", confirmPassword: "" },
  });

  const submit = handleSubmit(async (data) => {
    setFormError(null);
    try {
      const { terms } = await queryClient.fetchQuery(legalVersionsQuery);
      await signIn(
        await register({
          name: data.name.trim(),
          email: data.email.trim(),
          cpf: onlyDigits(data.cpf),
          password: data.password,
          acceptedTermsVersion: terms,
        }),
      );
    } catch (error) {
      setFormError(apiErrorMessage(error, "Não foi possível criar a conta"));
    }
  });

  const invalid = submitCount > 0 && Object.keys(errors).length > 0;
  const banner = formError ?? (invalid ? "Não foi possível criar a conta. Corrija os campos abaixo." : null);

  return (
    <Screen header={<NavBar title="Criar conta" />} contentStyle={styles.content}>
      <View style={styles.head}>
        <Text variant="title" accessibilityRole="header">
          Crie sua conta de treinador
        </Text>
        <Text variant="lead" color="textSecondary">
          Comece a estruturar treinos profissionais em minutos.
        </Text>
      </View>
      {banner === null ? null : <Banner message={banner} />}
      <View style={styles.fields}>
        <FormTextField
          control={control}
          name="name"
          label="Nome completo"
          placeholder="Seu nome"
          autoCapitalize="words"
          autoComplete="name"
          textContentType="name"
          returnKeyType="next"
          submitBehavior="submit"
          onSubmitEditing={() => setFocus("email")}
        />
        <FormTextField
          control={control}
          name="email"
          label="E-mail"
          placeholder="voce@exemplo.com"
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="email"
          textContentType="emailAddress"
          returnKeyType="next"
          submitBehavior="submit"
          onSubmitEditing={() => setFocus("cpf")}
        />
        <FormTextField
          control={control}
          name="cpf"
          label="CPF"
          placeholder="000.000.000-00"
          // number-pad has no return key on iOS, so the "next" chain stops here (tap the next field).
          keyboardType="number-pad"
          autoComplete="off"
          textContentType="none"
          format={maskCpf}
          returnKeyType="next"
          submitBehavior="submit"
          onSubmitEditing={() => setFocus("password")}
        />
        <FormTextField
          control={control}
          name="password"
          label="Senha"
          placeholder="Mínimo de 8 caracteres"
          help={PASSWORD_HELP_TEXT}
          password
          autoComplete="new-password"
          textContentType="newPassword"
          returnKeyType="next"
          submitBehavior="submit"
          onSubmitEditing={() => setFocus("confirmPassword")}
        />
        <FormTextField
          control={control}
          name="confirmPassword"
          label="Confirmar senha"
          placeholder="Repita a senha"
          password
          autoComplete="new-password"
          textContentType="newPassword"
          // Last field: "done" just closes the keyboard; the terms box and button follow.
          returnKeyType="done"
        />
      </View>
      <Controller
        control={control}
        name="terms"
        render={({ field: { value, onChange }, fieldState: { error } }) => (
          <Checkbox
            checked={value === true}
            onChange={onChange}
            error={error?.message}
            accessibilityLabel="Li e aceito os termos de uso e a política de privacidade."
            label={
              <Text variant="bodyLinks" color="textSecondary">
                Li e aceito os <InlineLink label="termos de uso" onPress={() => void openLegalPage("termos")} /> e a{" "}
                <InlineLink label="política de privacidade" onPress={() => void openLegalPage("privacidade")} />.
              </Text>
            }
          />
        )}
      />
      <Button
        label={isSubmitting ? "Criando conta…" : "Criar conta"}
        loading={isSubmitting}
        onPress={() => void submit()}
      />
      <AuthFooter
        question="Já tem uma conta?"
        action="Entrar"
        // Opened from a link with no history, "back" has nowhere to go.
        onPress={() => (router.canGoBack() ? router.back() : router.replace("/login"))}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  // M - Cadastro content: 16 top, 24 between groups.
  content: { paddingTop: space[4], gap: space[6] },
  head: { gap: space[2] },
  fields: { gap: space[5] },
});
