import * as SecureStore from "expo-secure-store";

/**
 * Where the session lives between launches: the iOS Keychain / Android Keystore through
 * `expo-secure-store`, never AsyncStorage (plain files). `WHEN_UNLOCKED_THIS_DEVICE_ONLY`: readable
 * only while the device is unlocked, and never restored onto another device from a backup — a
 * new device signs in again. A mobile token lasts 90 days since its last renewal, which makes
 * this storage choice matter more, not less.
 */
const TOKEN_KEY = "vertice.session.token";
/**
 * The session's renewal record, JSON `{ expiresAt, renewedAt }`: the expiry the BFF returned with
 * the token and when this device got it (epoch ms). Only a renewable mobile session has one. A
 * token without it came from a build before persistent sessions (an 8 h token, R18) or was refused
 * renewal (403 `SESSION_NOT_RENEWABLE`): it's never renewed and ends as it always did.
 */
const RENEWAL_KEY = "vertice.session.renewal";
const OPTIONS: SecureStore.SecureStoreOptions = {
  keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
};

export type RenewalRecord = {
  /** The token's expiry as the BFF sent it (ISO-8601). */
  expiresAt: string;
  /** When this device got the token, by its own clock (epoch ms): what "due daily" counts from. */
  renewedAt: number;
};

export type StoredSession = {
  token: string;
  /** Null for a session that can't be renewed. */
  renewal: RenewalRecord | null;
};

// Writes run one at a time, in call order: a renewal's write that started before a sign-out
// can't land after the sign-out's delete and bring the token back on the next launch.
let writes: Promise<unknown> = Promise.resolve();
function serialized(op: () => Promise<void>): Promise<void> {
  const run = writes.then(op, op);
  writes = run.catch(() => {});
  return run;
}

/** A stored record, or null for anything else (missing, or written by some other version). */
function parseRenewal(value: string | null): RenewalRecord | null {
  if (value === null) return null;
  try {
    const { expiresAt, renewedAt } = JSON.parse(value) as Partial<Record<keyof RenewalRecord, unknown>>;
    if (typeof expiresAt !== "string" || Number.isNaN(Date.parse(expiresAt))) return null;
    if (typeof renewedAt !== "number" || !Number.isFinite(renewedAt) || renewedAt <= 0) return null;
    return { expiresAt, renewedAt };
  } catch {
    return null;
  }
}

/**
 * The stored session, or null. A read error is treated as "no session for this launch" without
 * deleting anything: on iOS a read while the device is locked (a background launch) fails
 * transiently, and wiping the entry then would sign out a valid session.
 */
export async function readStoredSession(): Promise<StoredSession | null> {
  try {
    const token = await SecureStore.getItemAsync(TOKEN_KEY, OPTIONS);
    if (token === null) return null;
    const renewal = parseRenewal(await SecureStore.getItemAsync(RENEWAL_KEY, OPTIONS));
    return { token, renewal };
  } catch (error) {
    if (__DEV__) console.warn("Could not read the stored session.", error);
    return null;
  }
}

/** Stores the token and its renewal record (null: not renewable, and any old record goes). */
export function storeSession({ token, renewal }: StoredSession): Promise<void> {
  return serialized(async () => {
    await SecureStore.setItemAsync(TOKEN_KEY, token, OPTIONS);
    if (renewal === null) await deleteWithRetry(RENEWAL_KEY);
    else await SecureStore.setItemAsync(RENEWAL_KEY, JSON.stringify(renewal), OPTIONS);
  });
}

async function deleteWithRetry(key: string): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(key, OPTIONS);
  } catch {
    await SecureStore.deleteItemAsync(key, OPTIONS);
  }
}

/**
 * Deletes the stored session, retrying each delete once: a sign-out whose delete silently failed
 * would restore the session on the next launch. A second failure is thrown to the caller.
 */
export function clearStoredSession(): Promise<void> {
  return serialized(async () => {
    await deleteWithRetry(TOKEN_KEY);
    await deleteWithRetry(RENEWAL_KEY);
  });
}
