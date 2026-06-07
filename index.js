// Custom entry point.
// Unistyles MUST be configured before Expo Router evaluates any route/component
// module, so we import the theme config first, then hand off to expo-router.
import './src/theme/unistyles';
import 'expo-router/entry';
