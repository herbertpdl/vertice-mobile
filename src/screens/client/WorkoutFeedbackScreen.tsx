import { useMutation, useQueryClient } from "@tanstack/react-query";
import { router, useLocalSearchParams } from "expo-router";
import { Trophy } from "lucide-react-native";
import { useState } from "react";
import { StyleSheet, View } from "react-native";

import { Screen } from "@/components/layout";
import { Banner, Button, RatingScale, Text, TextArea, useToast } from "@/components/ui";
import { apiErrorMessage } from "@/lib/api/errorMessages";
import type { FeedbackRating } from "@/lib/api/types";
import { workoutLogsQueryPrefix } from "@/lib/api/workoutSessions";
import { useSingleFlight } from "@/lib/useSingleFlight";
import { sendNow } from "@/lib/workoutSession/outbox";
import { colors, radius, sizes, space, TINT_ALPHA, withAlpha } from "@/theme";

/** Online, how long sending waits for the answer before going home anyway (it's sent later). */
const SEND_WAIT_MS = 10_000;
/** The comment's bound (vertice-api `VARCHAR(2000)`). */
const MAX_TEXT = 2000;

/**
 * A - Feedback do Treino (+ Preenchido): right after finishing (R65), one of five faces (required)
 * and an optional comment (R66–R68), or "Pular" (R69). Feedback can't be given later (R70), so
 * leaving goes home either way.
 */
export function WorkoutFeedbackScreen() {
  const params = useLocalSearchParams<{ logId: string; name?: string; summary?: string }>();
  const logId = Number(params.logId);
  const queryClient = useQueryClient();
  const toast = useToast();
  const [rating, setRating] = useState<FeedbackRating | null>(null);
  const [text, setText] = useState("");

  const send = useMutation({
    // Through the outbox, after the session's finish (§3.4): offline it goes when the connection
    // returns (R56–R58).
    mutationFn: () => sendNow({ kind: "feedback", logId, rating: rating!, text: text.trim() }, SEND_WAIT_MS),
    onSuccess: (answer) => {
      void queryClient.invalidateQueries({ queryKey: workoutLogsQueryPrefix });
      router.replace("/aluno");
      toast.show(answer === null ? "Seu feedback será enviado quando a conexão voltar." : "Feedback enviado ao seu treinador.");
    },
  });
  const submit = useSingleFlight(() => send.mutateAsync().catch(() => {}));
  const skip = () => router.replace("/aluno");

  return (
    <Screen
      contentStyle={styles.content}
      footer={
        <View style={styles.footer}>
          <Button label="Enviar feedback" disabled={rating === null} loading={send.isPending} onPress={() => void submit()} />
          <Button label="Pular" variant="ghost" disabled={send.isPending} onPress={skip} />
        </View>
      }
    >
      <View style={styles.hero}>
        <View style={styles.icon}>
          <Trophy size={34} color={colors.success} />
        </View>
        <Text variant="title" accessibilityRole="header" align="center">
          Treino concluído!
        </Text>
        {params.name === undefined ? null : (
          <Text variant="body" color="textSecondary" align="center">
            {[params.name, params.summary].filter(Boolean).join(" · ")}
          </Text>
        )}
      </View>
      <View style={styles.card}>
        <View style={styles.question}>
          <Text variant="headingSm" weight="semibold">
            Como foi o treino?
          </Text>
          <Text variant="caption" color="textSecondary">
            Seu treinador vai ver sua resposta.
          </Text>
        </View>
        <RatingScale value={rating} onChange={setRating} />
      </View>
      <TextArea
        label="Quer contar algo ao seu treinador? (opcional)"
        placeholder="Ex.: senti dor no ombro, a carga ficou leve…"
        value={text}
        onChangeText={setText}
        maxLength={MAX_TEXT}
      />
      {send.isError ? (
        <Banner message={apiErrorMessage(send.error, "Não foi possível enviar. Tente novamente.")} />
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingTop: space[6], gap: space[6] },
  hero: { alignItems: "center", gap: space[3] },
  icon: {
    width: sizes.emptyDisc,
    height: sizes.emptyDisc,
    borderRadius: radius.full,
    backgroundColor: withAlpha(colors.success, TINT_ALPHA),
    alignItems: "center",
    justifyContent: "center",
  },
  card: {
    gap: space[4],
    paddingVertical: space[5],
    paddingHorizontal: space[1],
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  question: { gap: space[1], paddingHorizontal: space[4] },
  footer: { flex: 1, gap: space[1] },
});
