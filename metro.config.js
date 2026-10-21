// Sentry's Expo metro config: the default Expo config plus debug ids in the bundle, so release
// stack traces resolve against the uploaded source maps.
const { getSentryExpoConfig } = require("@sentry/react-native/metro");

module.exports = getSentryExpoConfig(__dirname);
