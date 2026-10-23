import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { StyleSheet, View } from "react-native";

import { FormTextField } from "@/components/form";
import { Banner } from "@/components/ui/Banner";
import { Button } from "@/components/ui/Button";
import { Divider } from "@/components/ui/Divider";
import { Sheet } from "@/components/ui/Sheet";
import { Switch } from "@/components/ui/Switch";
import { Text } from "@/components/ui/Text";
import { updateMe, type UpdateMeInput } from "@/lib/api/auth";
import { apiErrorMessage } from "@/lib/api/errorMessages";
import type { Me } from "@/lib/api/types";
import { meQueryKey } from "@/lib/auth";
import { sizes, space } from "@/theme";
import { maskCpf } from "@/lib/masks/cpf";
import { maskPhone } from "@/lib/masks/phone";
import { useSingleFlight } from "@/lib/useSingleFlight";
import { CREF_MAX, NAME_MAX } from "@/lib/validation/bounds";
import { profileChanges, profileDefaults, profileSchema, type ProfileInput } from "@/lib/validation/profile";

export type EditProfileSheetProps = {
  me: Me;
  visible: boolean;
  onClose: () => void;
  /** After a save (the sheet closes first, so the caller can toast). */
  onSaved: () => void;
};

/**
 * M - Editar Perfil (Sheet): name, e-mail, CPF and (a trainer's) CREF — the web's "Meu perfil"
 * rules (`profileSchema` / `profileChanges`). `GET /auth/me` only has the masked CPF, so the CPF
 * field starts empty and only a typed one is sent; a trainer's CPF can't be removed. Only the
 * changed fields go in the `PATCH`. Remount it (a new `key`) per opening.
 */
export function EditProfileSheet({ me, visible, onClose, onSaved }: EditProfileSheetProps) {
  const queryClient = useQueryClient();
  const isTrainer = me.role === "TRAINER";
  const {
    control,
    handleSubmit,
    formState: { isSubmitting },
  } = useForm<ProfileInput>({ resolver: zodResolver(profileSchema), defaultValues: profileDefaults(me) });

  const save = useMutation({
    mutationFn: (changes: UpdateMeInput) => updateMe(changes),
    onSuccess: (updated) => {
      queryClient.setQueryData<Me>(meQueryKey, updated);
      onClose();
      onSaved();
    },
  });
  const busy = isSubmitting || save.isPending;
  // A refusal ("E-mail ou CPF já cadastrado") is about what was sent: editing clears it.
  const values = useWatch({ control });
  const { reset: resetSave } = save;
  useEffect(() => {
    resetSave();
  }, [values, resetSave]);
  const submit = useSingleFlight(
    handleSubmit((values) => {
      const changes = profileChanges(me, values);
      // Nothing changed: nothing to send.
      if (Object.keys(changes).length === 0) return onClose();
      return save.mutateAsync(changes).catch(() => {});
    }),
  );

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      dismissible={!busy}
      title="Editar perfil"
      footer={
        <>
          <Button label="Cancelar" variant="secondary" style={styles.flex} disabled={busy} onPress={onClose} />
          <Button label="Salvar" style={styles.flex} loading={busy} onPress={() => void submit()} />
        </>
      }
    >
      {save.isError ? <Banner message={apiErrorMessage(save.error, "Não foi possível salvar o perfil")} /> : null}
      <FormTextField control={control} name="name" label="Nome completo" autoComplete="name" autoCapitalize="words" maxLength={NAME_MAX} />
      <FormTextField
        control={control}
        name="email"
        label="E-mail"
        keyboardType="email-address"
        autoComplete="email"
        autoCapitalize="none"
        autoCorrect={false}
        help="A troca vale na hora: o novo e-mail passa a ser o seu login."
      />
      <FormTextField
        control={control}
        name="newCpf"
        label="CPF"
        placeholder="000.000.000-00"
        keyboardType="number-pad"
        format={maskCpf}
        help={me.cpf ? `CPF cadastrado: ${me.cpf}. Deixe em branco para mantê-lo.` : "Nenhum CPF cadastrado."}
      />
      {isTrainer ? (
        <FormTextField
          control={control}
          name="cref"
          label="CREF"
          placeholder="000000-G/UF"
          autoCapitalize="characters"
          maxLength={CREF_MAX}
          help="Opcional. Formato 000000-G/UF."
        />
      ) : null}
      {isTrainer ? (
        <>
          <Divider />
          <View style={styles.contactsHead}>
            <Text variant="headingSm" weight="semibold" accessibilityRole="header">
              Contato para alunos
            </Text>
            <Text variant="caption" color="textSecondary">
              Seu nome sempre aparece para seus alunos. Escolha quais contatos eles podem ver no app.
            </Text>
          </View>
          <FormTextField
            control={control}
            name="whatsapp"
            label="WhatsApp"
            placeholder="(11) 98765-4321"
            keyboardType="phone-pad"
            autoComplete="tel"
            format={maskPhone}
          />
          <FormTextField
            control={control}
            name="instagram"
            label="Instagram"
            placeholder="@seu.usuario"
            autoCapitalize="none"
            autoCorrect={false}
            help="Só o usuário, sem o link."
          />
          <View style={styles.switches}>
            {(
              [
                ["showEmail", "Mostrar e-mail", values.email?.trim() ?? ""],
                ["showWhatsapp", "Mostrar WhatsApp", values.whatsapp ?? ""],
                ["showInstagram", "Mostrar Instagram", contactHandle(values.instagram ?? "")],
              ] as const
            ).map(([name, label, value]) => (
              <View key={name} style={styles.switchRow}>
                <View style={[styles.flex, styles.switchLines]}>
                  <Text variant="bodyMd">{label}</Text>
                  <Text variant="small" color="textSecondary" numberOfLines={1}>
                    {value === "" ? "Não informado" : value}
                  </Text>
                </View>
                <Controller
                  control={control}
                  name={name}
                  render={({ field }) => (
                    <Switch value={field.value} onValueChange={field.onChange} accessibilityLabel={`${label} aos alunos`} />
                  )}
                />
              </View>
            ))}
          </View>
        </>
      ) : null}
    </Sheet>
  );
}

/** "@rafael.treina" as the switch row shows it, from what's typed (with or without the @). */
function contactHandle(instagram: string): string {
  const handle = instagram.trim().replace(/^@/, "");
  return handle === "" ? "" : `@${handle}`;
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  contactsHead: { gap: space[1] },
  switches: { gap: space[3] },
  switchRow: { flexDirection: "row", alignItems: "center", gap: space[3] },
  switchLines: { gap: sizes.rowLinesGapTight },
});
