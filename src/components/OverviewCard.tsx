import { observer } from '@legendapp/state/react';
import { useRouter } from 'expo-router';
import { Pressable, Text, View } from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';

import { HabitGlyph } from '@/components/HabitGlyph';
import { YearHeatmap } from '@/components/YearHeatmap';
import { scheduleLabel, todayKey } from '@/lib/date';
import { completedDates, statsForHabit, type Habit } from '@/store';

/** Overview row: icon + name + total + the habit's year heatmap. Tap to open detail. */
export const OverviewCard = observer(function OverviewCard({
  habit,
  onLongPress,
}: {
  habit: Habit;
  onLongPress?: () => void;
}) {
  const { theme } = useUnistyles();
  const router = useRouter();
  const today = todayKey();
  const completed = completedDates(habit.id);
  // done days / active days elapsed — e.g. 5/50 (denominator in gray).
  const { total, days } = statsForHabit(habit.id, habit.start_date, habit.active_days);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${habit.name}, ${total} of ${days} days completed`}
      onPress={() => router.push({ pathname: '/habit/[id]', params: { id: habit.id } })}
      onLongPress={onLongPress}
      delayLongPress={220}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}>
      <View style={styles.head}>
        <HabitGlyph icon={habit.icon} size={18} color={habit.color ?? theme.colors.ink} />
        <View style={styles.titleCol}>
          <Text style={styles.name} numberOfLines={1}>
            {habit.name}
          </Text>
          <Text style={styles.schedule} numberOfLines={1}>
            {scheduleLabel(habit.active_days)}
          </Text>
        </View>
        <Text style={styles.total}>
          {total}
          <Text style={styles.totalDenom}>/{days}</Text>
        </Text>
      </View>
      <YearHeatmap
        completed={completed}
        startDate={habit.start_date}
        today={today}
        color={habit.color}
        activeDays={habit.active_days}
      />
    </Pressable>
  );
});

const styles = StyleSheet.create((theme) => ({
  card: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.radius.lg,
    padding: theme.space.lg,
    gap: theme.space.md,
  },
  pressed: {
    opacity: 0.92,
  },
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.space.sm,
  },
  titleCol: {
    flex: 1,
    gap: 2,
  },
  name: {
    fontSize: theme.font.body,
    fontWeight: theme.weight.semibold,
    color: theme.colors.textPrimary,
  },
  schedule: {
    fontSize: theme.font.caption,
    color: theme.colors.textSecondary,
  },
  total: {
    fontSize: theme.font.heading,
    fontWeight: theme.weight.bold,
    color: theme.colors.textPrimary,
  },
  totalDenom: {
    fontWeight: theme.weight.medium,
    color: theme.colors.textSecondary,
  },
}));
