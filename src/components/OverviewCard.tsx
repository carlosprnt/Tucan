import { observer } from '@legendapp/state/react';
import { SymbolView } from 'expo-symbols';
import { Text, View } from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';

import { YearHeatmap } from '@/components/YearHeatmap';
import { todayKey } from '@/lib/date';
import { habitIcon } from '@/lib/icons';
import { completedDates, type Habit } from '@/store';

/** Overview row: icon + name + total + the habit's year heatmap. */
export const OverviewCard = observer(function OverviewCard({ habit }: { habit: Habit }) {
  const { theme } = useUnistyles();
  const today = todayKey();
  const completed = completedDates(habit.id);

  return (
    <View style={styles.card}>
      <View style={styles.head}>
        <SymbolView name={habitIcon(habit.icon)} size={18} tintColor={habit.color ?? theme.colors.ink} />
        <Text style={styles.name} numberOfLines={1}>
          {habit.name}
        </Text>
        <Text style={styles.total}>{completed.size}</Text>
      </View>
      <YearHeatmap
        completed={completed}
        startDate={habit.start_date}
        today={today}
        color={habit.color}
      />
    </View>
  );
});

const styles = StyleSheet.create((theme) => ({
  card: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.radius.lg,
    padding: theme.space.lg,
    gap: theme.space.md,
  },
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.space.sm,
  },
  name: {
    flex: 1,
    fontSize: theme.font.body,
    fontWeight: theme.weight.semibold,
    color: theme.colors.textPrimary,
  },
  total: {
    fontSize: theme.font.heading,
    fontWeight: theme.weight.bold,
    color: theme.colors.textPrimary,
  },
}));
