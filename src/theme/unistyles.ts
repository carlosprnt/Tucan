import { StyleSheet } from 'react-native-unistyles';

import {
  breakpoints,
  darkTheme,
  lightTheme,
  type AppBreakpoints,
  type AppThemes,
} from './themes';

// Make Unistyles aware of our themes and breakpoints (typed everywhere).
declare module 'react-native-unistyles' {
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  export interface UnistylesThemes extends AppThemes {}
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  export interface UnistylesBreakpoints extends AppBreakpoints {}
}

StyleSheet.configure({
  themes: {
    light: lightTheme,
    dark: darkTheme,
  },
  breakpoints,
  settings: {
    // Follow the OS appearance by default; an explicit override (Settings
    // screen) is wired later via UnistylesRuntime.setAdaptiveThemes / setTheme.
    adaptiveThemes: true,
  },
});
