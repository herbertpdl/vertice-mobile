/* eslint-disable @typescript-eslint/no-require-imports -- jest.mock factories must require */

// Reanimated 4 and Worklets need their native runtime; under Jest they ship mocks that run
// animations synchronously. (`require("react-native-reanimated").setUpTests()` alone still loads
// the native Worklets module and crashes, hence the explicit module mocks.) The Reanimated mock
// lacks `useReducedMotion`: it's a `jest.fn` defaulting to false, so a test can switch the
// reduce-motion path on with `jest.mocked(useReducedMotion).mockReturnValue(true)`.
jest.mock("react-native-worklets", () => require("react-native-worklets/src/mock"));
jest.mock("react-native-reanimated", () => ({
  ...require("react-native-reanimated/src/mock"),
  useReducedMotion: jest.fn(() => false),
}));

// Components read safe-area insets; the library's own mock answers zero insets without a
// `SafeAreaProvider` (a test that needs real insets wraps its tree in one).
jest.mock("react-native-safe-area-context", () => require("react-native-safe-area-context/jest/mock").default);

// expo-secure-store has no native module under Jest: an in-memory keychain per test file.
jest.mock("expo-secure-store", () => {
  const store = new Map<string, string>();
  return {
    WHEN_UNLOCKED_THIS_DEVICE_ONLY: 2,
    getItemAsync: jest.fn(async (key: string) => store.get(key) ?? null),
    setItemAsync: jest.fn(async (key: string, value: string) => void store.set(key, value)),
    deleteItemAsync: jest.fn(async (key: string) => void store.delete(key)),
    __store: store,
  };
});

jest.mock("@react-native-community/netinfo", () =>
  require("@react-native-community/netinfo/jest/netinfo-mock.js"),
);
