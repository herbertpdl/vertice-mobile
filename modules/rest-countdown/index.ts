import { requireOptionalNativeModule } from "expo";

type RestCountdownModule = {
  show(endsAt: number, title: string, text: string): void;
  hide(): void;
};

/** Android only; null elsewhere. */
export default requireOptionalNativeModule<RestCountdownModule>("RestCountdown");
