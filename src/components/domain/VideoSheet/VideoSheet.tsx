import { CirclePlay } from "lucide-react-native";
import type { ReactNode } from "react";
import { StyleSheet, View } from "react-native";
import { WebView } from "react-native-webview";

import { Sheet, Text } from "@/components/ui";
import { env } from "@/lib/env";
import { youtubeVideoId } from "@/lib/video";
import { colors, radius, space } from "@/theme";

export type VideoSheetProps = {
  visible: boolean;
  onClose: () => void;
  title: string;
  videoUrl: string;
  description?: string;
  /** Docked under the player (the running rest timer, R60). */
  footer?: ReactNode;
};

/** The privacy-enhanced embed of a YouTube video, inline on iOS. */
export function embedUrl(videoId: string): string {
  return `https://www.youtube-nocookie.com/embed/${videoId}?playsinline=1&rel=0`;
}

/**
 * YouTube refuses embeds loaded without a Referer (player error 153), and a WebView's top-frame
 * load sends none: the app's web origin stands in for the page the embed sits on.
 */
export const EMBED_REFERER = `${new URL(env.EXPO_PUBLIC_WEB_URL).origin}/`;

/**
 * Only the embed may be the page (§3.6: no navigation away, e.g. the logo's link to youtube.com);
 * YouTube's own frames may load inside it.
 */
export function isAllowedNavigation({ url, isTopFrame = true }: { url: string; isTopFrame?: boolean }): boolean {
  if (url.startsWith("about:")) return true;
  try {
    const { protocol, hostname, pathname } = new URL(url);
    if (protocol !== "https:") return false;
    if (hostname === "www.youtube-nocookie.com" && pathname.startsWith("/embed/")) return true;
    return !isTopFrame && (hostname === "www.youtube.com" || hostname === "www.youtube-nocookie.com");
  } catch {
    return false;
  }
}

/**
 * A - Ver Execução (Sheet): the exercise's YouTube video played in the app (R59) — the same sheet
 * future uploaded videos will use. Nothing but the embed loads.
 */
export function VideoSheet({ visible, onClose, title, videoUrl, description, footer }: VideoSheetProps) {
  const id = youtubeVideoId(videoUrl);
  return (
    <Sheet visible={visible} onClose={onClose} title={title} footer={footer}>
      {id === null ? null : (
        <View style={styles.player}>
          <WebView
            source={{ uri: embedUrl(id), headers: { Referer: EMBED_REFERER } }}
            allowsInlineMediaPlayback
            mediaPlaybackRequiresUserAction={false}
            onShouldStartLoadWithRequest={isAllowedNavigation}
            style={styles.web}
            accessibilityLabel={`Vídeo de ${title}`}
          />
        </View>
      )}
      <View style={styles.source}>
        <CirclePlay size={16} color={colors.textTertiary} />
        <Text variant="small" color="textTertiary">
          Vídeo do YouTube · reproduzindo no app
        </Text>
      </View>
      {description === undefined || description.trim() === "" ? null : (
        <Text variant="bodyRelaxed" color="textSecondary">
          {description.trim()}
        </Text>
      )}
    </Sheet>
  );
}

const styles = StyleSheet.create({
  player: { aspectRatio: 16 / 9, borderRadius: radius.lg, overflow: "hidden", backgroundColor: colors.surfaceActive },
  web: { flex: 1, backgroundColor: colors.surfaceActive },
  source: { flexDirection: "row", alignItems: "center", gap: space[2] },
});
