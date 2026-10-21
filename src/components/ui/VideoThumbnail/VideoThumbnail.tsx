import { Image } from "expo-image";
import { Dumbbell, ExternalLink, Play } from "lucide-react-native";
import { useState } from "react";
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";

import { colors, overlay, radius, sizes, space } from "@/theme";

import { Text } from "../Text";

export type VideoThumbnailProps = {
  /** A still image (`videoThumbnailUrl`); none shows the dumbbell on `surfaceHover`. */
  imageUri: string | null;
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
};

/**
 * M Video Thumbnail: a 16:9 still with a 64 pt play disc and an "Abrir vídeo" chip, the whole
 * frame opening the video (externally — the app doesn't embed players). A link without a known
 * still (not YouTube) or one that fails to load shows the placeholder.
 */
export function VideoThumbnail({ imageUri, onPress, style }: VideoThumbnailProps) {
  const [failedUri, setFailedUri] = useState<string | null>(null);
  const showImage = imageUri !== null && imageUri !== failedUri;
  return (
    <Pressable accessibilityRole="link" accessibilityLabel="Abrir vídeo" onPress={onPress} style={[styles.frame, style]}>
      {showImage ? (
        <Image
          source={{ uri: imageUri }}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          transition={150}
          recyclingKey={imageUri}
          onError={() => setFailedUri(imageUri)}
        />
      ) : (
        <View style={[StyleSheet.absoluteFill, styles.placeholder]}>
          <Dumbbell size={sizes.emptyIcon} color={colors.textTertiary} />
        </View>
      )}
      <View style={styles.play}>
        <Play size={sizes.videoPlayGlyph} color={overlay.mediaGlyph} fill={overlay.mediaGlyph} />
      </View>
      <View style={styles.chip}>
        <ExternalLink size={14} color={overlay.mediaGlyph} />
        <Text variant="label" style={styles.chipLabel}>
          Abrir vídeo
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  frame: {
    width: "100%",
    aspectRatio: 16 / 9,
    borderRadius: radius.lg,
    overflow: "hidden",
    backgroundColor: colors.surfaceHover,
    alignItems: "center",
    justifyContent: "center",
  },
  placeholder: { alignItems: "center", justifyContent: "center" },
  play: {
    width: sizes.videoPlay,
    height: sizes.videoPlay,
    borderRadius: radius.full,
    backgroundColor: overlay.mediaScrim,
    borderWidth: 1,
    borderColor: overlay.mediaGlyphSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  chip: {
    position: "absolute",
    left: sizes.videoChipInset,
    bottom: sizes.videoChipInset,
    height: sizes.videoChipHeight,
    borderRadius: radius.full,
    backgroundColor: overlay.mediaScrim,
    paddingHorizontal: space[3],
    flexDirection: "row",
    alignItems: "center",
    gap: sizes.videoChipGap,
  },
  chipLabel: { color: overlay.mediaGlyph },
});
