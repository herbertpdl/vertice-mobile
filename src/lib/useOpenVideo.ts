import { useToast } from "@/components/ui/Toast";

import { useSingleFlight } from "./useSingleFlight";
import { openVideo } from "./video";

/** Opens a video once per tap, with a toast when it can't be opened. */
export function useOpenVideo(): (videoUrl: string) => Promise<void> {
  const toast = useToast();
  return useSingleFlight(async (videoUrl: string) => {
    if (!(await openVideo(videoUrl))) toast.show("Não foi possível abrir o vídeo.", "error");
  });
}
