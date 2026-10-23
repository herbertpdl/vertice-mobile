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

jest.mock("expo-clipboard", () => ({ setStringAsync: jest.fn(async () => true) }));

// The workout session's rest alerts (client spec §3.5): no native notification, haptic or audio
// module under Jest. Each call is a jest.fn a test can inspect.
jest.mock("expo-notifications", () => ({
  SchedulableTriggerInputTypes: { TIME_INTERVAL: "timeInterval" },
  setNotificationHandler: jest.fn(),
  getPermissionsAsync: jest.fn(async () => ({ status: "granted", canAskAgain: true })),
  requestPermissionsAsync: jest.fn(async () => ({ status: "granted", canAskAgain: true })),
  scheduleNotificationAsync: jest.fn(async () => "notification-id"),
  cancelScheduledNotificationAsync: jest.fn(async () => undefined),
  dismissAllNotificationsAsync: jest.fn(async () => undefined),
}));
jest.mock("expo-haptics", () => ({
  NotificationFeedbackType: { Success: "success" },
  notificationAsync: jest.fn(async () => undefined),
}));
jest.mock("expo-audio", () => {
  const player = { play: jest.fn(), seekTo: jest.fn(async () => undefined) };
  return { useAudioPlayer: jest.fn(() => player), setAudioModeAsync: jest.fn(async () => undefined), __player: player };
});
// Sentry's native SDK starts timers on import; nothing reports under Jest (monitoring.ts is off
// outside release builds anyway).
jest.mock("@sentry/react-native", () => ({ init: jest.fn(), captureException: jest.fn(), captureMessage: jest.fn() }));
// The workout outbox's store (client spec §3.4): an in-memory `expo-sqlite/kv-store`.
jest.mock("expo-sqlite/kv-store", () => {
  const items = new Map<string, string>();
  return {
    __esModule: true,
    default: {
      getItemSync: (key: string) => items.get(key) ?? null,
      setItemSync: (key: string, value: string) => void items.set(key, value),
      removeItemSync: (key: string) => void items.delete(key),
      getAllKeysSync: () => [...items.keys()],
      clearSync: () => items.clear(),
    },
  };
});
jest.mock("react-native-webview", () => {
  const { View } = require("react-native");
  return { WebView: (props: object) => require("react").createElement(View, { ...props, testID: "webview" }) };
});
