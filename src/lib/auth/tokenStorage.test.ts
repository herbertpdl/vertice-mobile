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

  it("treats an unreadable keychain entry as signed out, and clears it", async () => {
    jest.mocked(SecureStore.getItemAsync).mockRejectedValueOnce(new Error("decrypt failed"));
    await expect(readStoredToken()).resolves.toBeNull();
    expect(jest.mocked(SecureStore.deleteItemAsync)).toHaveBeenCalled();
  });
});
