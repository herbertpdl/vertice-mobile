import { zodResolver } from "@hookform/resolvers/zod";
import { router } from "expo-router";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { StyleSheet, View } from "react-native";
import { z } from "zod";

import { FormTextField } from "@/components/form";
import { Screen } from "@/components/layout/Screen";
import { Banner, Button, Divider, Logo, Text, TextLink } from "@/components/ui";
import { login } from "@/lib/api/auth";
import { ApiError } from "@/lib/api/client";
import { apiErrorMessage } from "@/lib/api/errorMessages";
import { useAuth } from "@/lib/auth";
import { loginSchema } from "@/lib/validation/auth";
import { sizes, space } from "@/theme";

// The web's form also asks "remember me"; the app's session always persists (SecureStore).
const loginFormSchema = loginSchema.omit({ remember: true });
type LoginForm = z.infer<typeof loginFormSchema>;

/** Same copy as the web's `LoginForm`. */
export function loginErrorMessage(error: unknown): string {
  if (error instanceof ApiError && error.status === 401) return "E-mail ou senha inválidos";
  return apiErrorMessage(error, "Não foi possível entrar");
}

/** M - Login / M - Login (Erro de Validação). */
export function LoginScreen() {
  const { signIn, sessionExpired } = useAuth();
  const [formError, setFormError] = useState<string | null>(null);
  const {
    control,
    handleSubmit,
    setFocus,
    formState: { isSubmitting, errors, submitCount },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginFormSchema),
    defaultValues: { email: "", password: "" },
  });

  const submit = handleSubmit(async ({ email, password }) => {
    setFormError(null);
    try {
      await signIn(await login({ email: email.trim(), password }));
    } catch (error) {
      setFormError(loginErrorMessage(error));
    }
  });

  const invalid = submitCount > 0 && Object.keys(errors).length > 0;
  const banner = formError ?? (invalid ? "Não foi possível entrar. Corrija os campos abaixo." : null);

  return (
    <Screen contentStyle={styles.content}>
      <Logo />
      <View style={styles.head}>
        <Text variant="display" accessibilityRole="header">
          Bem-vindo de volta
        </Text>
        <Text variant="lead" color="textSecondary">
          Entre para gerenciar seus alunos e treinos.
        </Text>
      </View>
      {banner !== null ? (
        <Banner message={banner} />
      ) : sessionExpired ? (
        <Banner tone="info" message="Sua sessão expirou. Entre novamente." />
      ) : null}
      <View style={styles.fields}>
        <FormTextField
          control={control}
          name="email"
          label="E-mail"
          placeholder="voce@exemplo.com"
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="email"
          textContentType="username"
          returnKeyType="next"
          submitBehavior="submit"
          onSubmitEditing={() => setFocus("password")}
        />
        <FormTextField
          control={control}
          name="password"
          label="Senha"
          placeholder="Digite sua senha"
          password
          autoComplete="current-password"
          textContentType="password"
          returnKeyType="go"
          onSubmitEditing={() => void submit()}
        />
      </View>
      <Button label={isSubmitting ? "Entrando…" : "Entrar"} loading={isSubmitting} onPress={() => void submit()} />
      <Divider label="ou" />
      <View style={styles.footer}>
        <Text variant="bodyMd" color="textSecondary">
          Não tem uma conta?
        </Text>
        <TextLink label="Cadastre-se" variant="bodyMdStrong" onPress={() => router.push("/cadastro")} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  // M - Login content: 24 top, 48 bottom, 28 between groups.
  content: { paddingTop: space[6], gap: sizes.authGroupGap },
  head: { gap: space[2] },
  fields: { gap: space[5] },
  footer: { flexDirection: "row", justifyContent: "center", alignItems: "center", gap: sizes.inlineLinkGap },
});
