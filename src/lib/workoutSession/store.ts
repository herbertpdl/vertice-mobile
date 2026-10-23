import Storage from "expo-sqlite/kv-store";

/** The outbox's key-value store on a device: `expo-sqlite/kv-store`, read and written synchronously. */
export const store = {
  get: (key: string): string | null => Storage.getItemSync(key),
  set: (key: string, value: string) => Storage.setItemSync(key, value),
  remove: (key: string) => void Storage.removeItemSync(key),
  keys: (): string[] => Storage.getAllKeysSync(),
};
