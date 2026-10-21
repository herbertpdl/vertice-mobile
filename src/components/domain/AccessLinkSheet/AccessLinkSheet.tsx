import { useMutation } from "@tanstack/react-query";
import { CircleCheck } from "lucide-react-native";
import { StyleSheet, View } from "react-native";

import { Banner, Button, Sheet, Text } from "@/components/ui";
import { ApiError } from "@/lib/api/client";
import { apiErrorMessage } from "@/lib/api/errorMessages";
import { issueStudentSetupToken } from "@/lib/api/students";
import { colors, radius, sizes, space, TINT_ALPHA, withAlpha } from "@/theme";

import { AccessLinkPanel } from "../AccessLinkPanel";

/**
 * M - Link de Acesso (Sheet) / (Senha definida). A token is shown once and only its hash is
 * stored upstream, so an earlier link can't be shown again: the trainer generates one here (the
 * previous link stops working — said up front). A 409 `PRECONDITION_FAILED` means the student has
 * already set a password and needs no link. The token lives in the mutation's state only, and the
 * parent remounts the sheet (new `key`) per opening, so an old token is never shown again.
 */
export function AccessLinkSheet({
  studentId,
  studentName,
  visible,
  onClose,
}: {
  studentId: number;
  studentName: string;
  visible: boolean;
  onClose: () => void;
}) {
  // gcTime 0: the token isn't kept in the mutation cache once this sheet is gone.
  const issue = useMutation({ gcTime: 0, mutationFn: () => issueStudentSetupToken(studentId) });
  const passwordSet = issue.error instanceof ApiError && issue.error.code === "PRECONDITION_FAILED";

  if (passwordSet) {
    return (
      <Sheet visible={visible} onClose={onClose} title="Link de acesso" footer={<Button label="Entendi" variant="secondary" style={styles.flex} onPress={onClose} />}>
        <View style={styles.done}>
          <View style={styles.check}>
            <CircleCheck size={24} color={colors.success} />
          </View>
          <Text variant="bodyLgStrong" accessibilityRole="header">
            O aluno já definiu a senha
          </Text>
          <Text variant="bodyMdRelaxed" color="textSecondary">
            {`${studentName} já acessa o app com e-mail e senha. Não é necessário enviar um link.`}
          </Text>
        </View>
      </Sheet>
    );
  }

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      dismissible={!issue.isPending}
      title="Link de acesso"
      footer={
        <Button
          label={issue.data === undefined ? "Gerar link" : "Gerar novo link"}
          variant={issue.data === undefined ? "primary" : "secondary"}
          loading={issue.isPending}
          style={styles.flex}
          onPress={() => {
            if (!issue.isPending) issue.mutate();
          }}
        />
      }
    >
      <Text variant="bodyMdRelaxed" color="textSecondary">
        {`Envie este link para ${studentName}. Ao abrir, ${studentName.split(" ")[0]} define a própria senha e passa a acessar os treinos no app.`}
      </Text>
      {issue.data === undefined ? (
        <Text variant="caption" color="textSecondary">
          Gerar um link invalida o anterior, se houver.
        </Text>
      ) : (
        <AccessLinkPanel studentName={studentName} setup={issue.data} />
      )}
      {issue.isError ? <Banner message={apiErrorMessage(issue.error, "Não foi possível gerar o link")} /> : null}
    </Sheet>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  done: { gap: space[2] },
  check: {
    width: sizes.dialogIcon,
    height: sizes.dialogIcon,
    borderRadius: radius.full,
    backgroundColor: withAlpha(colors.success, TINT_ALPHA),
    alignItems: "center",
    justifyContent: "center",
  },
});
