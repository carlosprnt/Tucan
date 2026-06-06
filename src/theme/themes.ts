/**
 * Tucan design tokens — radical monochrome + a single functional accent.
 *
 * Hierarchy comes from size and weight, NEVER from color. Color is only used
 * functionally (the "today" marker, the completion %). The dot grid is the hero.
 */

const palette = {
  // Warm off-white canvas in light; near-black (not pure #000) canvas in dark,
  // so the white "done" dot can breathe.
  paperLight: '#FBFAF7',
  paperDark: '#121212',

  inkLight: '#000000', // "done" + primary text (light)
  inkDark: '#FFFFFF', // "done" + primary text (dark)

  // "not done" (past) dot
  mutedDotLight: '#E5E5E5',
  mutedDotDark: '#3A3A3A',

  // future cell background (rendered as ghost / dotted on top)
  futureBgLight: '#F5F5F5',
  futureBgDark: '#1C1C1C',

  // single functional accent (today marker, %)
  accent: '#E5484D',
  accentOnDark: '#FF5A5F',
} as const;

const sharedTokens = {
  // 4pt spacing scale
  space: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 24,
    xxl: 32,
    xxxl: 48,
  },
  radius: {
    sm: 8,
    md: 16,
    lg: 24,
    pill: 999,
  },
  // Type scale — display numerals dominate.
  font: {
    display: 48,
    title: 28,
    heading: 20,
    body: 16,
    caption: 13,
  },
  weight: {
    regular: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
  },
} as const;

export const lightTheme = {
  colors: {
    canvas: palette.paperLight,
    card: '#FFFFFF',
    ink: palette.inkLight,
    textPrimary: palette.inkLight,
    textSecondary: '#7A7A78',
    textMuted: '#A8A8A6',
    dotDone: palette.inkLight,
    dotMissed: palette.mutedDotLight,
    dotFutureBg: palette.futureBgLight,
    dotFutureBorder: '#D8D8D6',
    separator: '#D8D8D6',
    accent: palette.accent,
  },
  ...sharedTokens,
} as const;

export const darkTheme = {
  colors: {
    canvas: palette.paperDark,
    card: '#1A1A1A',
    ink: palette.inkDark,
    textPrimary: palette.inkDark,
    textSecondary: '#9A9A9A',
    textMuted: '#5E5E5E',
    dotDone: palette.inkDark,
    dotMissed: palette.mutedDotDark,
    dotFutureBg: palette.futureBgDark,
    dotFutureBorder: '#2E2E2E',
    separator: '#2E2E2E',
    accent: palette.accentOnDark,
  },
  ...sharedTokens,
} as const;

export const breakpoints = {
  xs: 0,
  sm: 360,
  md: 600,
  lg: 900,
} as const;

export type AppThemes = {
  light: typeof lightTheme;
  dark: typeof darkTheme;
};

export type AppBreakpoints = typeof breakpoints;
