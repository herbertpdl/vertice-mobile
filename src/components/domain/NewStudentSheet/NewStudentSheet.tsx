import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Check } from "lucide-react-native";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { StyleSheet, View } from "react-native";

import { FormTextField } from "@/components/form";
import { Banner, Button, Sheet, Text } from "@/components/ui";
import { apiErrorMessage } from "@/lib/api/errorMessages";
import { createStudent } from "@/lib/api/students";
import type { CreatedStudent } from "@/lib/api/types";
import { maskCpf } from "@/lib/masks/cpf";
import { onlyDigits } from "@/lib/validation/cpf";
import { studentSchema, type StudentInput } from "@/lib/validation/students";
import { colors, radius, sizes, space, TINT_ALPHA, withAlpha } from "@/theme";

import { AccessLinkPanel } from "../AccessLinkPanel";

export const studentsQueryKey = ["students"] as const;

/**
 * M - Novo Aluno (Sheet) → M - Novo Aluno (Sucesso): creates the client (no password) and shows
 * the first-access link to share. The created student — token included — lives only in this
 * component's state: the token is shown once and never cached.
 */
export function NewStudentSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [created, setCreated] = useState<CreatedStudent | null>(null);
  const { control, handleSubmit, reset, setFocus } = useForm<StudentInput>({
    resolver: zodResolver(studentSchema),
    defaultValues: { name: "", email: "", cpf: "" },
  });
  const create = useMutation({
    mutationFn: (values: StudentInput) =>
      createStudent({ name: values.name.trim(), email: values.email, cpf: onlyDigits(values.cpf) }),
    onSuccess: (student) => {
      setCreated(student);
      void queryClient.invalidateQueries({ queryKey: studentsQueryKey });
    },
  });

  const close = () => {
    if (create.isPending) return;
    onClose();
    setCreated(null);
    create.reset();
    reset();
  };
  const submit = handleSubmit((values) => {
    if (!create.isPending) create.mutate(values);
  });

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
        {created.setup === null ? (
          <Banner tone="info" message="Não foi possível gerar o link agora. Gere um novo link na página do aluno." />
        ) : (
          <AccessLinkPanel studentName={created.name} setup={created.setup} />
        )}
      </Sheet>
    );
  }

  return (
    <Sheet
      visible={visible}
      onClose={close}
      dismissible={!create.isPending}
      title="Novo aluno"
      footer={
        <>
          <Button label="Cancelar" variant="secondary" style={styles.flex} disabled={create.isPending} onPress={close} />
          <Button label="Criar aluno" style={styles.flex} loading={create.isPending} onPress={() => void submit()} />
        </>
      }
    >
      {create.isError ? <Banner message={apiErrorMessage(create.error, "Não foi possível criar o aluno")} /> : null}
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
