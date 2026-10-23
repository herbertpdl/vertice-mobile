import { CirclePlay } from "lucide-react-native";
import type { ReactNode } from "react";
import { StyleSheet, View } from "react-native";
import { WebView } from "react-native-webview";

import { Sheet, Text } from "@/components/ui";
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

/** Only the embed itself and YouTube's own player frames may load (no navigation away). */
export function isAllowedNavigation(url: string): boolean {
  try {
    const host = new URL(url).hostname;
    return host === "www.youtube-nocookie.com" || host === "www.youtube.com" || url.startsWith("about:");
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
            source={{ uri: embedUrl(id) }}
            allowsInlineMediaPlayback
            mediaPlaybackRequiresUserAction={false}
            onShouldStartLoadWithRequest={(request) => isAllowedNavigation(request.url)}
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
