import * as SecureStore from "expo-secure-store";

import { clearStoredToken, readStoredToken, storeToken } from "./tokenStorage";

describe("tokenStorage", () => {
  it("round-trips the token through SecureStore, device-only", async () => {
    await storeToken("abc");
    expect(await readStoredToken()).toBe("abc");
    expect(jest.mocked(SecureStore.setItemAsync)).toHaveBeenCalledWith("vertice.session.token", "abc", {
      keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
    });
    await clearStoredToken();
    expect(await readStoredToken()).toBeNull();
  });

  it("treats an unreadable keychain as no session for this launch, without deleting it", async () => {
    await storeToken("keep-me");
    jest.mocked(SecureStore.getItemAsync).mockRejectedValueOnce(new Error("errSecInteractionNotAllowed"));
    jest.spyOn(console, "warn").mockImplementation(() => {});
    await expect(readStoredToken()).resolves.toBeNull();
    expect(jest.mocked(SecureStore.deleteItemAsync)).not.toHaveBeenCalled();
    expect(await readStoredToken()).toBe("keep-me");
  });

  it("retries a failed delete once, and throws if it fails again", async () => {
    jest.mocked(SecureStore.deleteItemAsync).mockRejectedValueOnce(new Error("busy"));
    await expect(clearStoredToken()).resolves.toBeUndefined();
    expect(jest.mocked(SecureStore.deleteItemAsync)).toHaveBeenCalledTimes(2);
    jest.mocked(SecureStore.deleteItemAsync).mockRejectedValueOnce(new Error("a")).mockRejectedValueOnce(new Error("b"));
    await expect(clearStoredToken()).rejects.toThrow("b");
  });
});
