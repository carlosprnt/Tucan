/**
 * Habit colors. `null` follows the theme ink; any value is a custom color.
 * Colors are free for everyone. `value` is stored on the habit.
 */
export interface HabitColorOption {
  value: string | null;
  label: string;
}

export const HABIT_COLORS: HabitColorOption[] = [
  { value: null, label: 'Default' },
  { value: '#E5484D', label: 'Red' },
  { value: '#F76808', label: 'Orange' },
  { value: '#FFB224', label: 'Amber' },
  { value: '#30A46C', label: 'Green' },
  { value: '#0091FF', label: 'Blue' },
  { value: '#6E56CF', label: 'Violet' },
  { value: '#E93D82', label: 'Pink' },
  { value: '#FF6B6B', label: 'Coral' },
  { value: '#4ECDC4', label: 'Teal' },
  { value: '#95E1D3', label: 'Mint' },
  { value: '#F38181', label: 'Rose' },
  { value: '#AA96DA', label: 'Lavender' },
  { value: '#FCBAD3', label: 'Mauve' },
];
