import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import Svg, { Path } from "react-native-svg";

import { colors, space } from "@/theme";

import { Text } from "../Text";

/** The "Ascent" path of pen.dev's Logo Mark (`dtmKR`), exact geometry from the design file. */
const ASCENT_PATH =
  "M155.375 97.75l-45.25-44.5 28.75-28.75 8.625 7.875 6.25-32.375-32 7.25 7 6.75-29 27.875-22-21.125-77.75 76.875 21.5 0 56.125-56.625 11.25 12.375-44.5 44.375 21.5 0 33.875-33.75 34 33.75 21.625 0z";

/** Logo Mark: the 34 pt frame with the mark inset as in the design (2.29, 2.60; 29.35 × 18.46). */
export function LogoMark({ size = 34 }: { size?: number }) {
  const scale = size / 34;
  return (
    <View style={{ width: size, height: size }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Svg
        width={29.35 * scale}
        height={18.46 * scale}
        viewBox="0 0 155.375 97.75"
        style={{ marginLeft: 2.29 * scale, marginTop: 2.6 * scale }}
      >
        <Path d={ASCENT_PATH} fill={colors.primary} />
      </Svg>
    </View>
  );
}

export type LogoProps = {
  /** `row`: mark + wordmark side by side (auth screens); `stacked`: centred (loading screen). */
  layout?: "row" | "stacked";
  style?: StyleProp<ViewStyle>;
};

/** The Vertice logo: Logo Mark + the tracked "VERTICE" wordmark. Read as "Vertice". */
export function Logo({ layout = "row", style }: LogoProps) {
  const stacked = layout === "stacked";
  return (
    <View
      style={[stacked ? styles.stacked : styles.row, style]}
      accessible
      accessibilityRole="image"
      accessibilityLabel="Vertice"
    >
      <LogoMark />
      <Text variant={stacked ? "wordmarkLg" : "wordmark"}>
        VERTICE
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: space[3] },
  stacked: { alignItems: "center", gap: space[4] },
});
