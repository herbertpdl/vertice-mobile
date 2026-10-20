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
