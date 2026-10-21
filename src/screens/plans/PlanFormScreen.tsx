import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState, type ReactNode } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { StyleSheet, View } from "react-native";

import { FormTextField } from "@/components/form";
import { NavBar, Screen } from "@/components/layout";
import { Banner, Button, DateField, ErrorState, SelectField, Skeleton, StatusBanner, TextArea, useToast } from "@/components/ui";
import { dashboardQueryKey } from "@/lib/api/dashboard";
import { apiErrorMessage } from "@/lib/api/errorMessages";
import { studentQueryKey, studentsQueryKey } from "@/lib/api/students";
import {
  createTrainingPlan,
  fetchTrainingPlan,
  trainingPlanQueryKey,
  trainingPlansQueryKey,
  updateTrainingPlan,
} from "@/lib/api/trainingPlans";
import type { PlanLevel, TrainingPlanDetail } from "@/lib/api/types";
import { PLAN_LEVELS } from "@/lib/labels";
import { useIsOffline } from "@/lib/network";
import { useRedirectOnError } from "@/lib/useRedirectOnError";
import { useSingleFlight } from "@/lib/useSingleFlight";
import { DESCRIPTION_MAX } from "@/lib/validation/bounds";
import {
  minPlanEndDate,
  minPlanStartDate,
  trainingPlanSchema,
  type TrainingPlanFormInput,
} from "@/lib/validation/trainingPlans";
import { sizes, space } from "@/theme";

const LEVEL_OPTIONS = (Object.keys(PLAN_LEVELS) as PlanLevel[]).map((level) => ({ value: level, label: PLAN_LEVELS[level] }));

/**
 * M - Novo Plano, and its edit mode (same layout, "Editar plano" / "Salvar"): `/planos/novo?clientId=`
 * creates, `/planos/[id]/editar` edits. Date and end-after-start rules are the web's
 * (`trainingPlanSchema`): a new plan can't start in the past; an existing one may keep its dates.
 */
export function PlanFormScreen() {
  const params = useLocalSearchParams<{ id?: string; clientId?: string }>();
  const editing = params.id !== undefined;
  const id = Number(params.id);
  const newFor = Number(params.clientId);
  const offline = useIsOffline();
  const plan = useQuery({
    queryKey: trainingPlanQueryKey(id),
    queryFn: ({ signal }) => fetchTrainingPlan(id, { signal }),
    enabled: editing,
  });
  useRedirectOnError(plan.error, "Plano não encontrado.", "/alunos");
  const badCreate = !editing && !(Number.isInteger(newFor) && newFor > 0);
  useEffect(() => {
    // `/planos/novo` without a student can't create anything: back to the roster.
    if (badCreate) router.replace("/alunos");
  }, [badCreate]);

  const header = (
    <>
      <NavBar title={editing ? "Editar plano" : "Novo plano"} />
      {offline ? <StatusBanner kind="offline" action={{ label: "Tentar", onPress: () => void plan.refetch() }} /> : null}
    </>
  );
  if (badCreate) return null;
  if (editing && plan.data === undefined) {
    return (
      <Screen header={header}>
        {plan.isError ? (
          <ErrorState onRetry={() => void plan.refetch()} retrying={plan.isFetching} />
        ) : (
          <Skeleton.Block width="100%" height={sizes.skeletonFormHeight} />
        )}
      </Screen>
    );
  }
  return <PlanForm header={header} plan={plan.data} clientId={editing ? plan.data!.clientId : newFor} />;
}

function PlanForm({ header, plan, clientId }: { header: ReactNode; plan?: TrainingPlanDetail; clientId: number }) {
  const queryClient = useQueryClient();
  const toast = useToast();
  // Frozen when the form opens (as the web): a form left open across midnight must not start
  // rejecting a start date the trainer already picked.
  const [minStart] = useState(() => minPlanStartDate(plan?.startDate));
  const schema = trainingPlanSchema(minStart, plan === undefined ? undefined : { startDate: plan.startDate, endDate: plan.endDate });
  const {
    control,
    handleSubmit,
    formState: { isSubmitting },
  } = useForm<TrainingPlanFormInput>({
    resolver: zodResolver(schema),
    defaultValues: plan
      ? { name: plan.name, description: plan.description, startDate: plan.startDate, endDate: plan.endDate, level: plan.level }
      : { name: "", description: "", startDate: "", endDate: "", level: undefined },
  });
  const startDate = useWatch({ control, name: "startDate" });

  const save = useMutation({
    mutationFn: (values: TrainingPlanFormInput) => {
      const body = { ...values, name: values.name.trim(), description: values.description.trim() };
      return plan === undefined ? createTrainingPlan({ ...body, clientId }) : updateTrainingPlan(plan.id, body);
    },
    onSuccess: (saved) => {
      void queryClient.invalidateQueries({ queryKey: trainingPlansQueryKey(clientId) });
      void queryClient.invalidateQueries({ queryKey: studentQueryKey(clientId) });
      void queryClient.invalidateQueries({ queryKey: trainingPlanQueryKey(saved.id) });
      void queryClient.invalidateQueries({ queryKey: studentsQueryKey });
      void queryClient.invalidateQueries({ queryKey: dashboardQueryKey });
      if (plan === undefined) {
        // The new plan replaces the form in the stack: back from it returns to the student.
        router.replace(`/planos/${saved.id}`);
        toast.show("Plano criado.");
      } else {
        router.back();
        toast.show("Plano atualizado.");
      }
    },
  });
  const busy = isSubmitting || save.isPending;
  // One tap, one request: two taps in the same frame would both pass an `isPending` check and,
  // on create, make two plans.
  const submit = useSingleFlight(handleSubmit((values) => save.mutateAsync(values).catch(() => {})));

  return (
    <Screen
      header={header}
      contentStyle={styles.content}
      footer={
        <View style={styles.footer}>
          <Button label="Cancelar" variant="secondary" style={styles.flex} disabled={busy} onPress={() => router.back()} />
          <Button label={plan === undefined ? "Criar plano" : "Salvar"} style={styles.flex} loading={busy} onPress={() => void submit()} />
        </View>
      }
    >
      {save.isError ? <Banner message={apiErrorMessage(save.error, "Não foi possível salvar o plano")} /> : null}
      <FormTextField control={control} name="name" label="Nome do plano" placeholder="Ex.: Hipertrofia III" autoCapitalize="sentences" />
      <Controller
        control={control}
        name="description"
        render={({ field: { value, onChange, onBlur }, fieldState: { error } }) => (
          <TextArea
            label="Descrição"
            placeholder="Objetivo, foco, observações para o aluno…"
            value={value}
            onChangeText={onChange}
            onBlur={onBlur}
            maxLength={DESCRIPTION_MAX}
            error={error?.message}
          />
        )}
      />
      <View style={styles.dates}>
        <Controller
          control={control}
          name="startDate"
          render={({ field: { value, onChange }, fieldState: { error } }) => (
            <DateField label="Início" value={value || null} onChange={onChange} min={minStart} error={error?.message} style={styles.flex} />
          )}
        />
        <Controller
          control={control}
          name="endDate"
          render={({ field: { value, onChange }, fieldState: { error } }) => (
            <DateField
              label="Término"
              value={value || null}
              onChange={onChange}
              min={minPlanEndDate(startDate, minStart)}
              error={error?.message}
              style={styles.flex}
            />
          )}
        />
      </View>
      <Controller
        control={control}
        name="level"
        render={({ field: { value, onChange }, fieldState: { error } }) => (
          <SelectField
            label="Nível"
            value={value ?? null}
            onChange={onChange}
            options={LEVEL_OPTIONS}
            error={error === undefined ? undefined : "Selecione o nível do plano."}
          />
        )}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingTop: space[2], gap: space[5] },
  dates: { flexDirection: "row", gap: space[3], alignItems: "flex-start" },
  footer: { flexDirection: "row", gap: space[3] },
  flex: { flex: 1 },
});
