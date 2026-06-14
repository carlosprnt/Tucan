import type { ExpoConfig } from 'expo/config';

/**
 * Tucan — minimalist, monochrome habit tracker.
 * Dynamic config (app.config.ts) so we can wire native config plugins and,
 * later, App Group entitlements for the iOS widget.
 */
const config: ExpoConfig = {
  name: 'Tucan',
  slug: 'Tucan',
  owner: 'carlosprnt',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/images/icon-tucan.png',
  scheme: 'tucan',
  userInterfaceStyle: 'automatic',
  ios: {
    bundleIdentifier: 'com.carlosprnt.tucan',
    buildNumber: '5',
    supportsTablet: false,
    // Only standard HTTPS/TLS — exempt from export compliance, so TestFlight
    // won't ask the encryption question on every build.
    config: { usesNonExemptEncryption: false },
    // Shared with the WidgetKit extension (see targets/widgets).
    entitlements: {
      'com.apple.security.application-groups': ['group.com.carlosprnt.tucan'],
    },
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
    '@bacons/apple-targets',
  ],
  experiments: {
    typedRoutes: true,
  },
  extra: {
    eas: {
      projectId: 'd97a8b93-3e7c-44e0-a01c-3804c943b02b',
    },
  },
};

export default config;
