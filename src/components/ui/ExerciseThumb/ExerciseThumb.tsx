import { Image } from "expo-image";
import { Dumbbell, Play } from "lucide-react-native";
import { useState } from "react";
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";

import { colors, overlay, radius } from "@/theme";

export type ExerciseThumbProps = {
  /** A still image (`videoThumbnailUrl`); null/undefined shows the dumbbell placeholder. */
  imageUri?: string | null;
  /** Draws the play badge: the exercise has a video. */
  hasVideo?: boolean;
  style?: StyleProp<ViewStyle>;
};

/**
 * M Exercise Thumb (56×56 photo + play badge) / M Exercise Thumb Placeholder (dumbbell on
 * `surfaceHover`). Decorative: the exercise name is always next to it. A still that fails to
 * load falls back to the placeholder.
 */
export function ExerciseThumb({ imageUri, hasVideo = false, style }: ExerciseThumbProps) {
  const [failed, setFailed] = useState(false);
  const showImage = imageUri != null && imageUri !== "" && !failed;

  return (
    <View
      style={[styles.box, style]}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      {showImage ? (
        <Image
          source={{ uri: imageUri }}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          transition={150}
          recyclingKey={imageUri}
          onError={() => setFailed(true)}
        />
      ) : (
        <Dumbbell size={24} color={colors.textTertiary} />
      )}
      {showImage && hasVideo ? (
        <View style={styles.play}>
          <Play size={12} color={overlay.mediaGlyph} fill={overlay.mediaGlyph} />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    width: 56,
    height: 56,
    borderRadius: radius.md,
    overflow: "hidden",
    backgroundColor: colors.surfaceHover,
    alignItems: "center",
    justifyContent: "center",
  },
  play: {
    width: 24,
    height: 24,
    borderRadius: radius.full,
    backgroundColor: overlay.mediaScrim,
    alignItems: "center",
    justifyContent: "center",
  },
});
