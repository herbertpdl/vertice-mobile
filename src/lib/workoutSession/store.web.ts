/**
 * On the web (the kit gallery; signing in doesn't work there, see the decisions log) the outbox
 * keeps nothing past the page: expo-sqlite's web build needs a WASM setup the app doesn't ship.
 */
const items = new Map<string, string>();

export const store = {
  get: (key: string): string | null => items.get(key) ?? null,
  set: (key: string, value: string) => void items.set(key, value),
  remove: (key: string) => void items.delete(key),
  keys: (): string[] => [...items.keys()],
};
