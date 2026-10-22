import type { LucideIcon } from "lucide-react-native";
import { StyleSheet, View } from "react-native";

import { Badge, Button, Divider, ProgressBar, Text } from "@/components/ui";
import type { PlanLevel } from "@/lib/api/types";
import { PLAN_LEVELS } from "@/lib/labels";
import { colors, radius, sizes, space, TINT_ALPHA, withAlpha, type ColorToken } from "@/theme";

/** The today block's color: cyan to train, amber in progress, green done, grey rest / empty. */
export type TodayTone = "primary" | "warning" | "success" | "neutral";

export type ActivePlanCardProps = {
  name: string;
  level: PlanLevel;
  /** "01 set – 30 nov · 4 treinos por semana". */
  meta: string;
  today: {
    tone: TodayTone;
    icon: LucideIcon;
    /** "TREINO DE HOJE · QUA", "EM ANDAMENTO", "CONCLUÍDO HOJE". */
    eyebrow: string;
    title: string;
    detail: string;
    /** 0–1, shown under the detail (a session in progress). */
    progress?: number;
  };
  action: { label: string; onPress: () => void; variant?: "primary" | "secondary"; disabled?: boolean };
  /** A quieter second action under the main one ("Descartar treino"). */
  secondary?: { label: string; onPress: () => void };
};

const TONE_COLOR: Record<TodayTone, ColorToken> = {
  primary: "primary",
  warning: "warning",
  success: "success",
  neutral: "textSecondary",
};

/**
 * The client's Início card (A - Início and its states): "PLANO ATIVO" with the level, the plan's
 * name and period, a divider, the today block (icon tile, eyebrow, workout, detail) and the main
 * button — the one primary intent of the screen.
 */
export function ActivePlanCard({ name, level, meta, today, action, secondary }: ActivePlanCardProps) {
  const tone = TONE_COLOR[today.tone];
  const Icon = today.icon;
  return (
    <View style={styles.card}>
      <View style={styles.head}>
        <View style={styles.top}>
          <Text variant="eyebrow" color="textTertiary">
            PLANO ATIVO
          </Text>
          <Badge tone="info" label={PLAN_LEVELS[level]} />
        </View>
        <Text variant="headline" accessibilityRole="header">
          {name}
        </Text>
        <Text variant="caption" color="textSecondary">
          {meta}
        </Text>
      </View>
      <Divider />
      <View style={styles.today}>
        <View
          style={[
            styles.tile,
            { backgroundColor: today.tone === "neutral" ? colors.surfaceActive : withAlpha(colors[tone], TINT_ALPHA) },
          ]}
        >
          <Icon size={24} color={colors[tone]} />
        </View>
        <View style={styles.col}>
          <Text variant="eyebrow" color={tone}>
            {today.eyebrow}
          </Text>
          <Text variant="navTitle">
            {today.title}
          </Text>
          <Text variant="caption" color="textSecondary">
            {today.detail}
          </Text>
          {today.progress === undefined ? null : (
            <ProgressBar value={today.progress} tone={today.tone === "warning" ? "warning" : "primary"} accessibilityLabel="Progresso do treino" />
          )}
        </View>
      </View>
      <View style={styles.actions}>
        <Button label={action.label} variant={action.variant ?? "primary"} disabled={action.disabled} onPress={action.onPress} />
        {secondary === undefined ? null : <Button label={secondary.label} variant="ghostDanger" onPress={secondary.onPress} />}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: sizes.activePlanGap,
    padding: space[5],
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  head: { gap: space[2] },
  top: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  today: { flexDirection: "row", alignItems: "center", gap: sizes.rowColumnGap },
  tile: { width: sizes.dayRow, height: sizes.dayRow, borderRadius: radius.md, alignItems: "center", justifyContent: "center" },
  col: { flex: 1, gap: sizes.rowLinesGap },
  actions: { gap: space[1] },
});
