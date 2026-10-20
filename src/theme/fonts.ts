import { Inter_400Regular } from "@expo-google-fonts/inter/400Regular";
import { Inter_500Medium } from "@expo-google-fonts/inter/500Medium";
import { Inter_600SemiBold } from "@expo-google-fonts/inter/600SemiBold";
import { Inter_700Bold } from "@expo-google-fonts/inter/700Bold";
import { SpaceGrotesk_500Medium } from "@expo-google-fonts/space-grotesk/500Medium";
import { SpaceGrotesk_600SemiBold } from "@expo-google-fonts/space-grotesk/600SemiBold";
import { SpaceGrotesk_700Bold } from "@expo-google-fonts/space-grotesk/700Bold";
import { useFonts } from "expo-font";

import { fontFamilies } from "./typography";

/**
 * Each weight is imported from its own subpath so the bundle carries only the seven files used,
 * not every weight and italic the packages ship. The keys are `fontFamilies`' names, which is
 * what `Text` sets as `fontFamily`.
 */
const fontAssets = {
  [fontFamilies.base.regular]: Inter_400Regular,
  [fontFamilies.base.medium]: Inter_500Medium,
  [fontFamilies.base.semibold]: Inter_600SemiBold,
  [fontFamilies.base.bold]: Inter_700Bold,
  [fontFamilies.heading.medium]: SpaceGrotesk_500Medium,
  [fontFamilies.heading.semibold]: SpaceGrotesk_600SemiBold,
  [fontFamilies.heading.bold]: SpaceGrotesk_700Bold,
};

/** `[loaded, error]` — the root layout keeps the splash up until one of them is set. */
export function useAppFonts(): [boolean, Error | null] {
  return useFonts(fontAssets);
}
