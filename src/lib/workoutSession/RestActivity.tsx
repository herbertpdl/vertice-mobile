import type { LiveActivityFactory } from "expo-widgets";

export type RestActivityProps = {
  /** Epoch ms. */
  startedAt: number;
  endsAt: number;
  /** "Próxima: série 3 · 12 reps". */
  caption: string;
};

/**
 * Live Activities are iOS's (`RestActivity.ios.tsx`). This keeps `@expo/ui/swift-ui`, which throws
 * as soon as it loads anywhere else, out of the Android and web bundles. It must stay `.tsx`: Metro
 * tries extensions in order, so a `.ts` file here would beat `.ios.tsx` on iOS too.
 */
const RestActivity: Pick<LiveActivityFactory<RestActivityProps>, "start" | "getInstances"> = {
  start: () => {
    throw new Error("Live Activities are iOS only.");
  },
  getInstances: () => [],
};

export default RestActivity;
