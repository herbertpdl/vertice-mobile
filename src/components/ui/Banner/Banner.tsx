import { CircleAlert, Info, WifiOff, type LucideIcon } from "lucide-react-native";
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";

import { useAnnounceOnIos } from "@/lib/a11y";
import { colors, controls, radius, screenPaddingHorizontal, sizes, SOFT_TINT_ALPHA, space, TINT_ALPHA, withAlpha, type ColorToken } from "@/theme";

import { Text } from "../Text";


export type BannerProps = {
  message: string;
  /** `danger` = M Form Error Banner, `info` = M Info Banner. */
  tone?: "danger" | "info";
  style?: StyleProp<ViewStyle>;
};

/**
 * M Form Error Banner / M Info Banner: a bordered message box above a form ("Não foi possível
 * entrar. Corrija os campos abaixo."). A danger banner is announced when it appears.
 */
export function Banner({ message, tone = "danger", style }: BannerProps) {
  useAnnounceOnIos(tone === "danger" ? message : undefined);
  const Icon = tone === "danger" ? CircleAlert : Info;
  return (
    <View
      style={[
        styles.banner,
        { backgroundColor: withAlpha(colors[tone], SOFT_TINT_ALPHA), borderColor: colors[tone] },
        style,
      ]}
      accessible
      accessibilityRole={tone === "danger" ? "alert" : undefined}
      accessibilityLiveRegion={tone === "danger" ? "assertive" : "none"}
      accessibilityLabel={message}
    >
      <Icon size={20} color={colors[tone]} />
      <Text variant="body" color={tone} style={styles.flex}>
        {message}
      </Text>
    </View>
  );
}

export type StatusBannerProps = {
  /** `offline` = M Offline Banner (warning), `error` = M Error Banner (danger). */
  kind: "offline" | "error";
  message?: string;
  action?: { label: string; onPress: () => void };
};

const statusLooks: Record<StatusBannerProps["kind"], { tone: ColorToken & ("warning" | "danger"); icon: LucideIcon; message: string }> = {
  offline: { tone: "warning", icon: WifiOff, message: "Sem conexão com a internet." },
  error: { tone: "danger", icon: CircleAlert, message: "Não foi possível atualizar." },
};

/** M Offline Banner / M Error Banner: a full-bleed 44 pt strip under the header. */
export function StatusBanner({ kind, message, action }: StatusBannerProps) {
  const look = statusLooks[kind];
  const Icon = look.icon;
  const text = message ?? look.message;
  return (
    <View
      style={[styles.strip, { backgroundColor: withAlpha(colors[look.tone], TINT_ALPHA) }]}
      accessibilityLiveRegion="polite"
    >
      <Icon size={16} color={colors[look.tone]} />
      <Text variant="caption" color={look.tone} style={styles.flex} numberOfLines={2}>
        {text}
      </Text>
      {action === undefined ? null : (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={action.label}
          onPress={action.onPress}
          hitSlop={{ left: 8, right: 8 }}
          style={styles.action}
        >
          <Text variant="label" color={look.tone}>
            {action.label}
          </Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: "row",
    alignItems: "center",
    gap: sizes.bannerGap,
    padding: sizes.bannerPadding,
    borderRadius: radius.md,
    borderWidth: 1,
  },
  strip: {
    minHeight: controls.hitTarget,
    flexDirection: "row",
    alignItems: "center",
    gap: sizes.bannerGap,
    paddingHorizontal: screenPaddingHorizontal,
    paddingVertical: space[2],
  },
  flex: { flex: 1 },
  action: { minHeight: controls.hitTarget, justifyContent: "center" },
});
