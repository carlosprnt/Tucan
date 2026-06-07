/**
 * Habit colors. Monochrome (null) is free; any real color is the single premium
 * gate in v1. `value` is stored on the habit (null = follow theme ink).
 */
export interface HabitColorOption {
  value: string | null;
  label: string;
  premium: boolean;
}

export const HABIT_COLORS: HabitColorOption[] = [
  { value: null, label: 'Default', premium: false },
  { value: '#E5484D', label: 'Red', premium: true },
  { value: '#F76808', label: 'Orange', premium: true },
  { value: '#FFB224', label: 'Amber', premium: true },
  { value: '#30A46C', label: 'Green', premium: true },
  { value: '#0091FF', label: 'Blue', premium: true },
  { value: '#6E56CF', label: 'Violet', premium: true },
  { value: '#E93D82', label: 'Pink', premium: true },
];
