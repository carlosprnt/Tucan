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
  { value: '#FF6B6B', label: 'Coral', premium: true },
  { value: '#4ECDC4', label: 'Teal', premium: true },
  { value: '#95E1D3', label: 'Mint', premium: true },
  { value: '#F38181', label: 'Rose', premium: true },
  { value: '#AA96DA', label: 'Lavender', premium: true },
  { value: '#FCBAD3', label: 'Mauve', premium: true },
];
