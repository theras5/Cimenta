// Minimal globals for jest-expo/react-native setup
if (typeof global.window === 'undefined') {
  global.window = {};
}
if (typeof global.navigator === 'undefined') {
  global.navigator = {};
}

