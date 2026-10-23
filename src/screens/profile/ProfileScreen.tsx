import { useMutation, useQuery } from "@tanstack/react-query";
import Constants from "expo-constants";
import { router } from "expo-router";
import { Download, FileText, KeyRound, LogOut, ShieldCheck, Trash2, UserPen } from "lucide-react-native";
import { useState } from "react";
import { StyleSheet, View } from "react-native";

import { EditProfileSheet, TrainerContactCard } from "@/components/domain";
import { Screen } from "@/components/layout";
import { Avatar, ErrorState, ListRow, Skeleton, StatusBanner, Text, useToast } from "@/components/ui";
import { exportMyData, fetchMyTrainer, myTrainerQueryKey } from "@/lib/api/auth";
import { ApiError } from "@/lib/api/client";
import { apiErrorMessage } from "@/lib/api/errorMessages";
import { rateLimitedMessage } from "@/lib/api/rateLimit";
import { useAuth, useMe } from "@/lib/auth";
import { shareExport } from "@/lib/exportData";
import { LEGAL_PAGE_TITLES, openLegalPage } from "@/lib/legal";
import { useIsOffline } from "@/lib/network";
import { usePullToRefresh } from "@/lib/usePullToRefresh";
import { useSingleFlight } from "@/lib/useSingleFlight";
import { colors, radius, sizes, space } from "@/theme";

/** 429 says when to try again; 413 `TOO_LARGE` has its own copy (the web's same rule). */
export function exportErrorMessage(error: unknown): string {
  return (
    rateLimitedMessage(error, "Limite de exportações atingido.") ??
    apiErrorMessage(error, "Não foi possível exportar seus dados. Tente novamente.")
  );
}

/**
 * M - Perfil / A - Perfil: who is signed in (avatar, name, e-mail, CREF), a client's "Seu
 * treinador" card (R74–R76; left out when they have no active trainer), Conta (Editar perfil,
 * Alterar senha), Privacidade (Termos, Política, Exportar meus dados), Sair and Excluir conta, and
 * the app version. A client's has no "Editar perfil" (PRD R73: their account is set up by their
 * trainer).
 */
export function ProfileScreen() {
  const { signOut } = useAuth();
  const me = useMe();
  const toast = useToast();
  const offline = useIsOffline();
  const [editing, setEditing] = useState(false);
  const [sheetKey, setSheetKey] = useState(0);
  const isClient = me.data?.role === "CLIENT";
  const trainer = useQuery({
    queryKey: myTrainerQueryKey,
    queryFn: ({ signal }) => fetchMyTrainer({ signal }),
    enabled: isClient,
  });
  // A 404 on a refetch (the trainer ended the relationship) hides the card the cache still holds.
  const hasTrainer = trainer.data !== undefined && !(trainer.error instanceof ApiError && trainer.error.status === 404);
  const pull = usePullToRefresh(() => Promise.all([me.refetch(), ...(isClient ? [trainer.refetch()] : [])]));

  const exportData = useMutation({
    mutationFn: async () => shareExport(await exportMyData()),
    onError: (error) => toast.show(exportErrorMessage(error), "error"),
  });
  const runExport = useSingleFlight(() => exportData.mutateAsync().catch(() => {}));

  const retry = { label: "Tentar", onPress: () => void me.refetch() };
  const data = me.data;
  const version = Constants.expoConfig?.version;

  return (
    <Screen
      inTabs
      refreshing={pull.refreshing}
      onRefresh={pull.onRefresh}
      contentStyle={styles.content}
      header={
        offline ? (
          <StatusBanner kind="offline" action={retry} />
        ) : me.isError && data !== undefined ? (
          <StatusBanner kind="error" action={retry} />
        ) : undefined
      }
    >
      <Text variant="title" accessibilityRole="header">
        Perfil
      </Text>
      {data === undefined ? (
        me.isError ? (
          <ErrorState onRetry={() => void me.refetch()} retrying={me.isFetching} />
        ) : (
          <View style={styles.identity} accessible accessibilityLabel="Carregando perfil">
            <Skeleton.Circle size={64} />
            <View style={styles.lines}>
              <Skeleton.Line width="60%" />
              <Skeleton.Line width="80%" />
            </View>
          </View>
        )
      ) : (
        <View style={styles.identity}>
          <Avatar name={data.name} size={64} />
          <View style={styles.lines}>
            <Text variant="headingSm" numberOfLines={2}>
              {data.name}
            </Text>
            <Text variant="body" color="textSecondary" numberOfLines={1}>
              {data.email}
            </Text>
            {data.cref === "" ? null : (
              <Text variant="small" color="textSecondary">
                CREF {data.cref}
              </Text>
            )}
          </View>
        </View>
      )}

      {/* No trainer (a 404) or not loaded: the card is simply not there; it isn't the screen's subject. */}
      {isClient && hasTrainer && trainer.data !== undefined ? (
        <View style={styles.group}>
          <Text variant="overline" color="textSecondary" accessibilityRole="header">
            SEU TREINADOR
          </Text>
          <TrainerContactCard trainer={trainer.data} />
        </View>
      ) : null}

      <Group title="CONTA">
        {data?.role === "CLIENT" ? null : (
        <ListRow
          icon={UserPen}
          label="Editar perfil"
          disabled={data === undefined}
          onPress={() => {
            setSheetKey((key) => key + 1);
            setEditing(true);
          }}
        />
        )}
        <ListRow icon={KeyRound} label="Alterar senha" last onPress={() => router.push("/perfil/senha")} />
      </Group>

      <Group title="PRIVACIDADE">
        <ListRow icon={FileText} label={LEGAL_PAGE_TITLES.termos} role="link" onPress={() => void openLegalPage("termos")} />
        <ListRow icon={ShieldCheck} label={LEGAL_PAGE_TITLES.privacidade} role="link" onPress={() => void openLegalPage("privacidade")} />
        <ListRow
          icon={Download}
          label="Exportar meus dados"
          accessibilityState={{ busy: exportData.isPending }}
          last
          onPress={() => void runExport()}
        />
      </Group>

      <Group>
        <ListRow icon={LogOut} label="Sair" onPress={() => void signOut("user")} />
        <ListRow icon={Trash2} label="Excluir conta" danger last onPress={() => router.push("/perfil/excluir-conta")} />
      </Group>

      {version === undefined ? null : (
        <Text variant="caption" color="textTertiary" align="center">
          Vertice {version}
        </Text>
      )}

      {data === undefined ? null : (
        <EditProfileSheet
          key={sheetKey}
          me={data}
          visible={editing}
          onClose={() => setEditing(false)}
          onSaved={() => toast.show("Perfil atualizado.")}
        />
      )}
    </Screen>
  );
}

/** A titled group of M List Rows (the settings card). */
function Group({ title, children }: { title?: string; children: React.ReactNode }) {
  return (
    <View style={styles.group}>
      {title === undefined ? null : (
        <Text variant="overline" color="textSecondary" accessibilityRole="header">
          {title}
        </Text>
      )}
      <View style={styles.card}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { paddingTop: space[3], gap: space[5] },
  identity: { flexDirection: "row", alignItems: "center", gap: space[4] },
  lines: { flex: 1, gap: sizes.rowLinesGap },
  group: { gap: space[2] },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
  },
});
