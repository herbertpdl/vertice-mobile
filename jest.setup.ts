// Reanimated 4 and Worklets need their native runtime; under Jest they ship official mocks that
// run animations synchronously. The Reanimated mock lacks `useReducedMotion`; tests run with
// motion on, so components exercise their animated path.
jest.mock("react-native-worklets", () => require("react-native-worklets/src/mock"));
jest.mock("react-native-reanimated", () => ({
  ...require("react-native-reanimated/src/mock"),
  useReducedMotion: () => false,
}));
