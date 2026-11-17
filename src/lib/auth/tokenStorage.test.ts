import * as SecureStore from "expo-secure-store";

import { clearStoredSession, readStoredSession, storeSession } from "./tokenStorage";

const RECORD = { expiresAt: "2027-02-15T12:00:00.000Z", renewedAt: 1_700_000_000_000 };
const DEVICE_ONLY = { keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY };

afterEach(async () => {
  await clearStoredSession();
  jest.mocked(SecureStore.setItemAsync).mockClear();
  jest.mocked(SecureStore.deleteItemAsync).mockClear();
});

describe("tokenStorage", () => {
  it("round-trips the session through SecureStore, device-only", async () => {
    await storeSession({ token: "abc", renewal: RECORD });
    expect(await readStoredSession()).toEqual({ token: "abc", renewal: RECORD });
    expect(jest.mocked(SecureStore.setItemAsync)).toHaveBeenCalledWith("vertice.session.token", "abc", DEVICE_ONLY);
    expect(jest.mocked(SecureStore.setItemAsync)).toHaveBeenCalledWith(
      "vertice.session.renewal",
      JSON.stringify(RECORD),
      DEVICE_ONLY,
    );
    await clearStoredSession();
    expect(await readStoredSession()).toBeNull();
    expect(await SecureStore.getItemAsync("vertice.session.renewal")).toBeNull();
  });

  it("reads a token stored by an older build (no renewal record) as not renewable", async () => {
    await SecureStore.setItemAsync("vertice.session.token", "legacy");
    expect(await readStoredSession()).toEqual({ token: "legacy", renewal: null });
    for (const garbage of ["{", "null", '{"expiresAt":"nope","renewedAt":1}', '{"expiresAt":"2027-01-01T00:00:00Z"}']) {
      await SecureStore.setItemAsync("vertice.session.renewal", garbage);
      expect(await readStoredSession()).toEqual({ token: "legacy", renewal: null });
    }
  });

  it("a null renewal record clears an old one", async () => {
    await storeSession({ token: "a", renewal: RECORD });
    await storeSession({ token: "a", renewal: null });
    expect(await readStoredSession()).toEqual({ token: "a", renewal: null });
  });

  it("runs writes in call order: a delete issued after a store always wins", async () => {
    let releaseWrite!: () => void;
    jest
      .mocked(SecureStore.setItemAsync)
      .mockImplementationOnce(() => new Promise<void>((resolve) => (releaseWrite = resolve)));
    const store = storeSession({ token: "renewed", renewal: RECORD });
    const clear = clearStoredSession();
    await Promise.resolve();
    // The delete hasn't started while the store is still writing.
    expect(jest.mocked(SecureStore.deleteItemAsync)).not.toHaveBeenCalled();
    releaseWrite();
    await Promise.all([store, clear]);
    expect(await readStoredSession()).toBeNull();
  });

  it("treats an unreadable keychain as no session for this launch, without deleting it", async () => {
    await storeSession({ token: "keep-me", renewal: RECORD });
    jest.mocked(SecureStore.deleteItemAsync).mockClear();
    jest.mocked(SecureStore.getItemAsync).mockRejectedValueOnce(new Error("errSecInteractionNotAllowed"));
    jest.spyOn(console, "warn").mockImplementation(() => {});
    await expect(readStoredSession()).resolves.toBeNull();
    expect(jest.mocked(SecureStore.deleteItemAsync)).not.toHaveBeenCalled();
    expect((await readStoredSession())?.token).toBe("keep-me");
  });

  it("retries a failed delete once, and throws if it fails again", async () => {
    jest.mocked(SecureStore.deleteItemAsync).mockRejectedValueOnce(new Error("busy"));
    await expect(clearStoredSession()).resolves.toBeUndefined();
    expect(jest.mocked(SecureStore.deleteItemAsync)).toHaveBeenCalledTimes(3);
    jest.mocked(SecureStore.deleteItemAsync).mockRejectedValueOnce(new Error("a")).mockRejectedValueOnce(new Error("b"));
    await expect(clearStoredSession()).rejects.toThrow("b");
    // A failed write doesn't jam the queue for the next one.
    await expect(storeSession({ token: "next", renewal: null })).resolves.toBeUndefined();
  });
});
