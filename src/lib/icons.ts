import type { SFSymbol } from 'expo-symbols';

/** Monochrome SF Symbol used when a habit has no icon set. */
export const DEFAULT_HABIT_ICON: SFSymbol = 'circle.fill';

/** Coerce a stored icon string into a typed SF Symbol name. */
export function habitIcon(icon: string | null | undefined): SFSymbol {
  return (icon ?? DEFAULT_HABIT_ICON) as SFSymbol;
}

/** Starter habit suggestions surfaced on first run / in the create form. */
export const HABIT_NAME_SUGGESTIONS: { name: string; icon: SFSymbol }[] = [
  { name: 'Drink water', icon: 'drop.fill' },
  { name: 'Exercise', icon: 'figure.run' },
  { name: 'Read', icon: 'book.fill' },
  { name: 'Meditate', icon: 'brain.head.profile' },
  { name: 'Sleep early', icon: 'moon.fill' },
];

/** Suggested icons surfaced in the create form (monochrome line set). */
export const HABIT_ICON_SUGGESTIONS: { key: SFSymbol; label: string }[] = [
  { key: 'drop.fill', label: 'Water' },
  { key: 'figure.run', label: 'Exercise' },
  { key: 'book.fill', label: 'Read' },
  { key: 'brain.head.profile', label: 'Meditate' },
  { key: 'moon.fill', label: 'Sleep' },
  { key: 'dumbbell.fill', label: 'Gym' },
  { key: 'leaf.fill', label: 'Nature' },
  { key: 'cup.and.saucer.fill', label: 'Coffee' },
];
