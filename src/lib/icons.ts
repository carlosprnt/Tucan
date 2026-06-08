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
  { name: 'Walk', icon: 'figure.walk' },
  { name: 'Journal', icon: 'pencil' },
  { name: 'Vitamins', icon: 'pills.fill' },
  { name: 'Save money', icon: 'dollarsign.circle.fill' },
  { name: 'Eat healthy', icon: 'fork.knife' },
];

/** Icons available in the create form (monochrome SF Symbols). */
export const HABIT_ICON_SUGGESTIONS: { key: SFSymbol; label: string }[] = [
  { key: 'drop.fill', label: 'Water' },
  { key: 'figure.run', label: 'Run' },
  { key: 'book.fill', label: 'Read' },
  { key: 'brain.head.profile', label: 'Meditate' },
  { key: 'moon.fill', label: 'Sleep' },
  { key: 'dumbbell.fill', label: 'Gym' },
  { key: 'leaf.fill', label: 'Nature' },
  { key: 'cup.and.saucer.fill', label: 'Coffee' },
  { key: 'heart.fill', label: 'Health' },
  { key: 'star.fill', label: 'Star' },
  { key: 'flame.fill', label: 'Streak' },
  { key: 'bolt.fill', label: 'Energy' },
  { key: 'bicycle', label: 'Cycle' },
  { key: 'figure.walk', label: 'Walk' },
  { key: 'fork.knife', label: 'Eat' },
  { key: 'carrot.fill', label: 'Veggies' },
  { key: 'pencil', label: 'Write' },
  { key: 'paintbrush.fill', label: 'Paint' },
  { key: 'music.note', label: 'Music' },
  { key: 'guitars.fill', label: 'Guitar' },
  { key: 'camera.fill', label: 'Photo' },
  { key: 'gamecontroller.fill', label: 'Play' },
  { key: 'dollarsign.circle.fill', label: 'Money' },
  { key: 'cart.fill', label: 'Shop' },
  { key: 'pills.fill', label: 'Meds' },
  { key: 'bed.double.fill', label: 'Rest' },
  { key: 'alarm.fill', label: 'Alarm' },
  { key: 'sun.max.fill', label: 'Sun' },
  { key: 'hands.sparkles.fill', label: 'Care' },
  { key: 'figure.pool.swim', label: 'Swim' },
  { key: 'airplane', label: 'Travel' },
  { key: 'briefcase.fill', label: 'Work' },
  { key: 'laptopcomputer', label: 'Study' },
  { key: 'phone.fill', label: 'Call' },
  { key: 'house.fill', label: 'Home' },
  { key: 'pawprint.fill', label: 'Pet' },
  { key: 'globe', label: 'World' },
  { key: 'wineglass.fill', label: 'Drink' },
];
