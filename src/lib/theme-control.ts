import { UnistylesRuntime } from 'react-native-unistyles';

import type { ThemePref } from '@/store';

/** Apply the user's theme preference to the Unistyles runtime. */
export function applyThemePref(pref: ThemePref): void {
  if (pref === 'auto') {
    UnistylesRuntime.setAdaptiveThemes(true);
  } else {
    UnistylesRuntime.setAdaptiveThemes(false);
    UnistylesRuntime.setTheme(pref);
  }
}
