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

export async function readStoredToken(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(KEY, OPTIONS);
  } catch {
    // A keychain that can't be read (restored backup, changed device lock) is a signed-out state,
    // not a crash: drop the unreadable entry so the next launch starts clean.
    await clearStoredToken();
    return null;
  }
}

export async function storeToken(token: string): Promise<void> {
  await SecureStore.setItemAsync(KEY, token, OPTIONS);
}

export async function clearStoredToken(): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(KEY, OPTIONS);
  } catch {
    // Nothing stored, or already unreadable: either way there's no token left.
  }
}
