import * as SecureStore from "expo-secure-store";

/**
 * Where the session token lives between launches: the iOS Keychain / Android Keystore through
 * `expo-secure-store`, never AsyncStorage (plain files). `WHEN_UNLOCKED_THIS_DEVICE_ONLY`: readable
 * only while the device is unlocked, and never restored onto another device from a backup — a
 * new device signs in again.
 */
const KEY = "vertice.session.token";
const OPTIONS: SecureStore.SecureStoreOptions = {
  keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
};

/**
 * The stored token, or null. A read error is treated as "no session for this launch" without
 * deleting anything: on iOS a read while the device is locked (a background launch) fails
 * transiently, and wiping the entry then would sign out a valid session.
 */
export async function readStoredToken(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(KEY, OPTIONS);
  } catch (error) {
    if (__DEV__) console.warn("Could not read the stored session.", error);
    return null;
  }
}

export async function storeToken(token: string): Promise<void> {
  await SecureStore.setItemAsync(KEY, token, OPTIONS);
}

/**
 * Deletes the stored token, retrying once: a sign-out whose delete silently failed would restore
 * the session on the next launch. A second failure is thrown to the caller.
 */
export async function clearStoredToken(): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(KEY, OPTIONS);
  } catch {
    await SecureStore.deleteItemAsync(KEY, OPTIONS);
  }
}
