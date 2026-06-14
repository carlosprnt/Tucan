import { Appearance } from 'react-native';
import { UnistylesRuntime } from 'react-native-unistyles';

import type { ThemePref } from '@/store';

/**
 * Apply the user's theme preference to Unistyles AND the native color scheme, so
 * native UI (date/time picker, alerts, action sheets, keyboard) matches the app's
 * theme instead of following the system. Otherwise, app-in-light on a dark phone
 * shows e.g. the time picker's text light-on-light (invisible).
 */
export function applyThemePref(pref: ThemePref): void {
  if (pref === 'auto') {
    UnistylesRuntime.setAdaptiveThemes(true);
    Appearance.setColorScheme('unspecified'); // follow the system
  } else {
    UnistylesRuntime.setAdaptiveThemes(false);
    UnistylesRuntime.setTheme(pref);
    Appearance.setColorScheme(pref); // 'light' | 'dark'
  }
}
