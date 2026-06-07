import type { ExpoConfig } from 'expo/config';

/**
 * Tucan — minimalist, monochrome habit tracker.
 * Dynamic config (app.config.ts) so we can wire native config plugins and,
 * later, App Group entitlements for the iOS widget.
 */
const config: ExpoConfig = {
  name: 'Tucan',
  slug: 'Tucan',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/images/icon.png',
  scheme: 'tucan',
  userInterfaceStyle: 'automatic',
  ios: {
    icon: './assets/expo.icon',
    bundleIdentifier: 'com.carlosprnt.tucan',
    supportsTablet: false,
  },
  android: {
    package: 'com.carlosprnt.tucan',
    adaptiveIcon: {
      backgroundColor: '#E6F4FE',
      foregroundImage: './assets/images/android-icon-foreground.png',
      backgroundImage: './assets/images/android-icon-background.png',
      monochromeImage: './assets/images/android-icon-monochrome.png',
    },
    predictiveBackGestureEnabled: false,
  },
  web: {
    output: 'static',
    favicon: './assets/images/favicon.png',
  },
  plugins: [
    'expo-router',
    [
      'expo-splash-screen',
      {
        backgroundColor: '#FBFAF7',
        dark: { backgroundColor: '#121212' },
        android: {
          image: './assets/images/splash-icon.png',
          imageWidth: 76,
        },
      },
    ],
    'react-native-edge-to-edge',
    'expo-dev-client',
    [
      '@react-native-google-signin/google-signin',
      {
        // Reversed iOS OAuth client id, e.g. com.googleusercontent.apps.123-abc
        iosUrlScheme:
          process.env.EXPO_PUBLIC_GOOGLE_IOS_URL_SCHEME ??
          'com.googleusercontent.apps.PLACEHOLDER',
      },
    ],
    'expo-apple-authentication',
    '@react-native-community/datetimepicker',
  ],
  experiments: {
    typedRoutes: true,
    reactCompiler: true,
  },
};

export default config;
