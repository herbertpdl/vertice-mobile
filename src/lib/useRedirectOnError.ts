import { router } from "expo-router";
import { useEffect } from "react";

import { useToast } from "@/components/ui/Toast";
import { ApiError } from "@/lib/api/client";

/**
 * Leaves a detail screen whose resource is gone or not the trainer's (404 `NOT_FOUND`, 403
 * `FORBIDDEN` — a deleted student, someone else's plan), like the web's `useRedirectOnError`:
 * back where the user came from (or `fallback` without history), with a toast saying why.
 */
export function useRedirectOnError(error: unknown, message: string, fallback: "/alunos" | "/exercicios" | "/"): void {
  const toast = useToast();
  const gone = error instanceof ApiError && (error.code === "NOT_FOUND" || error.code === "FORBIDDEN");
  useEffect(() => {
    if (!gone) return;
    if (router.canGoBack()) router.back();
    else router.replace(fallback);
    toast.show(message, "error");
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once per failure
  }, [gone]);
}
