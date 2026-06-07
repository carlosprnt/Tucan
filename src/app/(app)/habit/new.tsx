import '@/theme/unistyles';

import { useLocalSearchParams } from 'expo-router';

import { HabitForm } from '@/components/HabitForm';

// Shared create/edit sheet. With an `id` param it edits (preloaded + delete).
export default function HabitFormScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  return <HabitForm habitId={id} />;
}
