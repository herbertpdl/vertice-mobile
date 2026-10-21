import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { StyleSheet } from "react-native";

import { FormTextField } from "@/components/form";
import { Banner } from "@/components/ui/Banner";
import { Button } from "@/components/ui/Button";
import { Sheet } from "@/components/ui/Sheet";
import { updateMe, type UpdateMeInput } from "@/lib/api/auth";
import { apiErrorMessage } from "@/lib/api/errorMessages";
import type { Me } from "@/lib/api/types";
import { meQueryKey } from "@/lib/auth";
import { maskCpf } from "@/lib/masks/cpf";
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
    </Sheet>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
});
