import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render } from "@testing-library/react-native";
import type { ReactElement } from "react";

import { ToastProvider } from "@/components/ui/Toast";

/** A fresh query client per test: no retries, no cache shared between tests. */
export function testQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: Infinity }, mutations: { retry: false } },
  });
}

/** Renders a screen with the providers every screen expects (query client, toasts). */
export function renderScreen(ui: ReactElement, queryClient: QueryClient = testQueryClient()) {
  return render(
    <QueryClientProvider client={queryClient}>
      <ToastProvider>{ui}</ToastProvider>
    </QueryClientProvider>,
  );
}
