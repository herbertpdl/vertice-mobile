import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";

import { myPlansQueryKey } from "@/lib/api/trainingPlans";
import { workoutLogsQueryPrefix } from "@/lib/api/workoutSessions";
import { useMe } from "@/lib/auth";

import { closeOutbox, openOutbox } from "./outbox";

/**
 * Runs the signed-in client's workout outbox while the client app is mounted (its layout), and
 * refreshes what the sent writes changed once it drains (§3.4).
 */
export function useWorkoutOutbox() {
  const queryClient = useQueryClient();
  const userId = useMe().data?.id;
  useEffect(() => {
    if (userId === undefined) return;
    openOutbox(userId, () => {
      void queryClient.invalidateQueries({ queryKey: workoutLogsQueryPrefix });
      void queryClient.invalidateQueries({ queryKey: myPlansQueryKey });
      // Marked stale only: an open session keeps its snapshot (R29); the next opening refetches.
      void queryClient.invalidateQueries({ queryKey: ["workoutSession"], refetchType: "none" });
    });
    return () => closeOutbox();
  }, [userId, queryClient]);
}
