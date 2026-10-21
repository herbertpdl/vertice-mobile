import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Check } from "lucide-react-native";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { StyleSheet, View } from "react-native";

import { FormTextField } from "@/components/form";
import { Banner, Button, Sheet, Text } from "@/components/ui";
import { ApiError } from "@/lib/api/client";
import { dashboardQueryKey } from "@/lib/api/dashboard";
import { apiErrorMessage, errorMessages } from "@/lib/api/errorMessages";
import { createStudent, issueStudentSetupToken, studentsQueryKey } from "@/lib/api/students";
import type { CreatedStudent, PasswordSetup } from "@/lib/api/types";
import { maskCpf } from "@/lib/masks/cpf";
import { useSingleFlight } from "@/lib/useSingleFlight";
import { onlyDigits } from "@/lib/validation/cpf";
import { studentSchema, type StudentInput } from "@/lib/validation/students";
import { colors, radius, sizes, space, TINT_ALPHA, withAlpha } from "@/theme";

import { AccessLinkPanel } from "../AccessLinkPanel";

/**
 * M - Novo Aluno (Sheet) → M - Novo Aluno (Sucesso): creates the client (no password) and shows
 * the first-access link to share. The token is shown once: it lives in this component's state,
 * and the mutations that carry it (and the CPF) are dropped from the mutation cache at once
 * (`gcTime: 0`). The parent gives it a new `key` each time it opens, so every opening starts from
 * an empty form — resetting on close instead would flash the form while the success sheet fades.
 */
export function NewStudentSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [created, setCreated] = useState<CreatedStudent | null>(null);
  const [setup, setSetup] = useState<PasswordSetup | null>(null);
  const {
    control,
    handleSubmit,
    setFocus,
    setError,
    formState: { isSubmitting },
  } = useForm<StudentInput>({
    resolver: zodResolver(studentSchema),
    defaultValues: { name: "", email: "", cpf: "" },
  });
  const create = useMutation({
    gcTime: 0,
    mutationFn: (values: StudentInput) =>
      createStudent({ name: values.name.trim(), email: values.email, cpf: onlyDigits(values.cpf) }),
    onSuccess: (student) => {
      setCreated(student);
      setSetup(student.setup);
      void queryClient.invalidateQueries({ queryKey: studentsQueryKey });
      void queryClient.invalidateQueries({ queryKey: dashboardQueryKey });
    },
    onError: (error) => {
      // Same as the web: the BFF answers one 409 for a taken e-mail or CPF; show it on the e-mail.
      if (error instanceof ApiError && error.code === "CONFLICT") {
        setError("email", { message: errorMessages.CONFLICT });
      }
    },
  });
  const reissue = useMutation({
    gcTime: 0,
    mutationFn: (id: number) => issueStudentSetupToken(id),
    onSuccess: setSetup,
  });

  const busy = isSubmitting || create.isPending;
  const close = () => {
    if (!busy) onClose();
  };
  const submit = useSingleFlight(handleSubmit((values) => create.mutateAsync(values).catch(() => {})));
  const conflict = create.error instanceof ApiError && create.error.code === "CONFLICT";

  if (created !== null) {
    return (
      <Sheet visible={visible} onClose={close} title="Aluno criado" footer={<Button label="Concluir" variant="secondary" style={styles.flex} onPress={close} />}>
        <View style={styles.success}>
          <View style={styles.check}>
            <Check size={24} color={colors.success} />
          </View>
          <Text variant="bodyLgStrong" accessibilityRole="header">{`${created.name} foi adicionado`}</Text>
          <Text variant="bodyMdRelaxed" color="textSecondary">
            Compartilhe o link de acesso para que ele defina a senha e comece a usar o app.
          </Text>
        </View>
        {setup === null ? (
          <>
            <Banner tone="info" message="Não foi possível gerar o link de acesso. Tente gerar de novo." />
            {reissue.isError ? <Banner message={apiErrorMessage(reissue.error, "Não foi possível gerar o link")} /> : null}
            <Button
              label="Gerar link de acesso"
              loading={reissue.isPending}
              onPress={() => {
                if (!reissue.isPending) reissue.mutate(created.id);
              }}
            />
          </>
        ) : (
          <AccessLinkPanel studentName={created.name} setup={setup} />
        )}
      </Sheet>
    );
  }

  return (
    <Sheet
      visible={visible}
      onClose={close}
      dismissible={!busy}
      title="Novo aluno"
      footer={
        <>
          <Button label="Cancelar" variant="secondary" style={styles.flex} disabled={busy} onPress={close} />
          <Button label="Criar aluno" style={styles.flex} loading={busy} onPress={() => void submit()} />
        </>
      }
    >
      {create.isError && !conflict ? <Banner message={apiErrorMessage(create.error, "Não foi possível criar o aluno")} /> : null}
      <FormTextField
        control={control}
        name="name"
        label="Nome completo"
        placeholder="Nome do aluno"
        autoCapitalize="words"
        autoComplete="off"
        returnKeyType="next"
        submitBehavior="submit"
        onSubmitEditing={() => setFocus("email")}
      />
      <FormTextField
        control={control}
        name="email"
        label="E-mail"
        placeholder="aluno@exemplo.com"
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="off"
        returnKeyType="next"
        submitBehavior="submit"
        onSubmitEditing={() => setFocus("cpf")}
      />
      <FormTextField
        control={control}
        name="cpf"
        label="CPF"
        placeholder="000.000.000-00"
        keyboardType="number-pad"
        autoComplete="off"
        textContentType="none"
        format={maskCpf}
        help="Após criar, você recebe um link de acesso para enviar ao aluno."
      />
    </Sheet>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  success: { gap: space[2] },
  check: {
    width: sizes.dialogIcon,
    height: sizes.dialogIcon,
    borderRadius: radius.full,
    backgroundColor: withAlpha(colors.success, TINT_ALPHA),
    alignItems: "center",
    justifyContent: "center",
  },
});
