import { HStack, Image, Spacer, Text, VStack } from "@expo/ui/swift-ui";
import { activityBackgroundTint, font, foregroundStyle, monospacedDigit, padding } from "@expo/ui/swift-ui/modifiers";
import { createLiveActivity, type LiveActivityEnvironment } from "expo-widgets";

export type RestActivityProps = {
  /** Epoch ms. */
  startedAt: number;
  endsAt: number;
  /** "Próxima: série 3 · 12 reps". */
  caption: string;
};

/**
 * The rest on the lock screen and in the Dynamic Island. The system counts it down by itself, with
 * the app suspended, and `isStale` turns it into "Descanso terminou" when the rest ends. This runs in
 * the widget extension, which sees nothing outside the function: the colours are the theme's
 * `primary` and `success`, written out.
 */
const RestActivity = (props: RestActivityProps, environment: LiveActivityEnvironment) => {
  "widget";
  const primary = "#00E5FF";
  const success = "#2ED573";
  const ended = environment.isStale === true;
  const timer = { lower: new Date(props.startedAt), upper: new Date(props.endsAt) };
  const countdown = (size: number) => (
    <Text timerInterval={timer} countsDown modifiers={[font({ size, weight: "bold" }), monospacedDigit(), foregroundStyle("#FFFFFF")]} />
  );
  const icon = <Image systemName={ended ? "checkmark.circle.fill" : "timer"} color={ended ? success : primary} />;
  const title = (
    <Text modifiers={[font({ size: 13, weight: "semibold" }), foregroundStyle(ended ? success : primary)]}>
      {ended ? "DESCANSO TERMINOU" : "DESCANSO"}
    </Text>
  );
  const caption = <Text modifiers={[font({ size: 14 }), foregroundStyle("#FFFFFF")]}>{ended ? "Hora da próxima série." : props.caption}</Text>;

  return {
    banner: (
      <HStack modifiers={[padding({ all: 16 }), activityBackgroundTint("#0A0E14")]}>
        <VStack alignment="leading">
          {title}
          {caption}
        </VStack>
        <Spacer />
        {ended ? icon : countdown(34)}
      </HStack>
    ),
    compactLeading: icon,
    compactTrailing: ended ? icon : countdown(14),
    minimal: icon,
    expandedLeading: <VStack modifiers={[padding({ all: 8 })]}>{icon}</VStack>,
    expandedTrailing: <VStack modifiers={[padding({ all: 8 })]}>{ended ? icon : countdown(24)}</VStack>,
    expandedBottom: (
      <VStack alignment="leading" modifiers={[padding({ all: 8 })]}>
        {title}
        {caption}
      </VStack>
    ),
  };
};

export default createLiveActivity("RestActivity", RestActivity);
