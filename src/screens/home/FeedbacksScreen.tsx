import { useQuery } from "@tanstack/react-query";
import { MessageSquare } from "lucide-react-native";
import { FlatList, RefreshControl, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { FeedbackRow } from "@/components/domain";
import { NavBar } from "@/components/layout/NavBar";
import { Screen } from "@/components/layout/Screen";
import { EmptyState, ErrorState, Skeleton, StatusBanner, Text } from "@/components/ui";
import { fetchFeedback } from "@/lib/api/feedback";
import { useIsOffline } from "@/lib/network";
import { usePullToRefresh } from "@/lib/usePullToRefresh";
import { colors, screenPaddingHorizontal, sizes, space } from "@/theme";

export const feedbackQueryKey = ["feedback"] as const;

/** M - Feedbacks / M - Feedbacks (Vazio): every comment students left, newest first. */
export function FeedbacksScreen() {
  const insets = useSafeAreaInsets();
  const offline = useIsOffline();
  const feedback = useQuery({ queryKey: feedbackQueryKey, queryFn: ({ signal }) => fetchFeedback({ signal }) });
  const pull = usePullToRefresh(() => feedback.refetch());
  const retry = { label: "Tentar", onPress: () => void feedback.refetch() };

  return (
    <Screen
      header={
        <>
          <NavBar title="Feedbacks" />
          {offline ? (
            <StatusBanner kind="offline" action={retry} />
          ) : feedback.isError && feedback.data !== undefined ? (
            <StatusBanner kind="error" action={retry} />
          ) : null}
        </>
      }
      scroll={false}
    >
      {feedback.data === undefined && !feedback.isError ? (
        <FeedbackSkeleton />
      ) : feedback.data === undefined ? (
        <ErrorState onRetry={() => void feedback.refetch()} retrying={feedback.isFetching} />
      ) : (
        <FlatList
          data={feedback.data}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + space[6] }]}
          ListHeaderComponent={
            feedback.data.length === 0 ? null : (
              <Text variant="caption" color="textSecondary">
                Mais recentes primeiro
              </Text>
            )
          }
          ListEmptyComponent={
            <EmptyState
              icon={MessageSquare}
              title="Nenhum feedback ainda"
              message="Os comentários que os alunos deixam ao concluir um treino aparecem aqui."
              style={styles.empty}
            />
          }
          renderItem={({ item, index }) => (
            <FeedbackRow feedback={item} withDay last={index === feedback.data.length - 1} />
          )}
          refreshControl={
            <RefreshControl
              refreshing={pull.refreshing}
              onRefresh={pull.onRefresh}
              tintColor={colors.primary}
              colors={[colors.primary]}
              progressBackgroundColor={colors.surface}
            />
          }
        />
      )}
    </Screen>
  );
}

function FeedbackSkeleton() {
  return (
    <View style={[styles.list, styles.skeleton]} accessible accessibilityLabel="Carregando feedbacks">
      {[0, 1, 2, 3, 4].map((row) => (
        <View key={row} style={styles.skeletonRow}>
          <Skeleton.Circle size={40} />
          <View style={styles.skeletonText}>
            <Skeleton.Line width="60%" />
            <Skeleton.Line width="90%" />
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { paddingHorizontal: screenPaddingHorizontal, paddingTop: space[2], gap: space[1] },
  empty: { paddingVertical: sizes.emptyScreenPaddingVertical },
  skeleton: { gap: space[5] },
  skeletonRow: { flexDirection: "row", alignItems: "center", gap: sizes.rowColumnGap },
  skeletonText: { flex: 1, gap: space[2] },
});
