import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Controller, useForm, useWatch } from "react-hook-form";
import { StyleSheet } from "react-native";

import { FormTextField } from "@/components/form";
import { Banner, Button, Checkbox, Sheet, useToast } from "@/components/ui";
import { ApiError } from "@/lib/api/client";
import { dashboardQueryKey } from "@/lib/api/dashboard";
import { apiErrorMessage, errorMessages } from "@/lib/api/errorMessages";
import { feedbackQueryKey } from "@/lib/api/feedback";
import { studentQueryKey, studentsQueryKey, updateStudent } from "@/lib/api/students";
import type { ClientDetail } from "@/lib/api/types";
import { maskCpf } from "@/lib/masks/cpf";
import { useSingleFlight } from "@/lib/useSingleFlight";
import { editStudentBody, editStudentDefaults, editStudentSchema, type EditStudentInput } from "@/lib/validation/students";

/**
 * M - Editar Aluno (Sheet). The BFF only ever answers a masked CPF (`***.***.***-25`), so the
 * form never holds it (as the web): the CPF field starts empty — left empty keeps the stored one,
 * typed replaces it, and "Remover CPF" clears it. The parent remounts it (new `key`) per opening,
 * so each opening starts from the student as they are now.
 */
export function EditStudentSheet({ student, visible, onClose }: { student: ClientDetail; visible: boolean; onClose: () => void }) {
  const queryClient = useQueryClient();
  const toast = useToast();
  const {
    control,
    handleSubmit,
    setFocus,
    setError,
    setValue,
    clearErrors,
    formState: { isSubmitting },
  } = useForm<EditStudentInput>({
    resolver: zodResolver(editStudentSchema),
    defaultValues: editStudentDefaults(student),
  });
  const removeCpf = useWatch({ control, name: "removeCpf" });
  const save = useMutation({
    mutationFn: (values: EditStudentInput) => updateStudent(student.id, editStudentBody(values)),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: studentQueryKey(student.id) });
      void queryClient.invalidateQueries({ queryKey: studentsQueryKey });
      // Both carry the student's name.
      void queryClient.invalidateQueries({ queryKey: dashboardQueryKey });
      void queryClient.invalidateQueries({ queryKey: feedbackQueryKey });
      onClose();
      toast.show("Aluno atualizado.");
    },
    onError: (error) => {
      // As the web: a taken e-mail or CPF (one 409 for both) goes on the e-mail field.
      if (error instanceof ApiError && error.code === "CONFLICT") setError("email", { message: errorMessages.CONFLICT });
    },
  });
  const conflict = save.error instanceof ApiError && save.error.code === "CONFLICT";

  const busy = isSubmitting || save.isPending;
  const submit = useSingleFlight(handleSubmit((values) => save.mutateAsync(values).catch(() => {})));

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      dismissible={!busy}
      title="Editar aluno"
      footer={
        <>
          <Button label="Cancelar" variant="secondary" style={styles.flex} disabled={busy} onPress={onClose} />
          <Button label="Salvar" style={styles.flex} loading={busy} onPress={() => void submit()} />
        </>
      }
    >
      {save.isError && !conflict ? <Banner message={apiErrorMessage(save.error, "Não foi possível salvar o aluno")} /> : null}
      <FormTextField
        control={control}
        name="name"
        label="Nome completo"
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
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="off"
      />
      <FormTextField
        control={control}
        name="newCpf"
        label="CPF"
        placeholder={student.cpf === "" ? "000.000.000-00" : student.cpf}
        help={student.cpf === "" ? "Opcional." : "Deixe em branco para manter o CPF atual."}
        keyboardType="number-pad"
        autoComplete="off"
        textContentType="none"
        format={maskCpf}
        disabled={removeCpf}
      />
      {student.cpf === "" ? null : (
        <Controller
          control={control}
          name="removeCpf"
          render={({ field: { value, onChange } }) => (
            <Checkbox
              checked={value}
              onChange={(checked) => {
                // A half-typed CPF must not keep failing validation on a field that's now disabled.
                if (checked) {
                  setValue("newCpf", "");
                  clearErrors("newCpf");
                }
                onChange(checked);
              }}
              label="Remover o CPF do aluno"
            />
          )}
        />
      )}
    </Sheet>
  );
}

const styles = StyleSheet.create({ flex: { flex: 1 } });
