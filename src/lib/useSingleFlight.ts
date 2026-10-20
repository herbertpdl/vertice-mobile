import { useRef } from "react";

/**
 * Wraps an action so a second call while the first is still pending is dropped — one tap, one
 * request (the web's `ConfirmDialog` rule). A ref, not state: state only changes on the next
 * render, so two taps in the same frame would both get through a `loading` check.
 */
export function useSingleFlight<A extends unknown[]>(
  action: (...args: A) => void | Promise<unknown>,
): (...args: A) => Promise<void> {
  const pending = useRef(false);
  return async (...args: A) => {
    if (pending.current) return;
    pending.current = true;
    try {
      await action(...args);
    } finally {
      pending.current = false;
    }
  };
}
