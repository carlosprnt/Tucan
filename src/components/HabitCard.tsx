import { observer } from '@legendapp/state/react';
import { useRouter } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useState } from 'react';
import { type LayoutChangeEvent, Pressable, Text, View } from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';

import { todayKey } from '@/lib/date';
import { buildRecentStates } from '@/lib/grid';
import { habitIcon } from '@/lib/icons';
import {
  completedDates,
  toggleCompletion,
  totalForHabit,
  type Habit,
} from '@/store';

import { DotGrid } from './DotGrid';
import { TodayToggle } from './TodayToggle';

const DOT_SIZE = 9;
const DOT_GAP = 5;
const GRID_ROWS = 3;

export const HabitCard = observer(function HabitCard({ habit }: { habit: Habit }) {
  const router = useRouter();
  const { theme } = useUnistyles();
  const [gridWidth, setGridWidth] = useState(0);

  const today = todayKey();
  const completed = completedDates(habit.id);
  const total = totalForHabit(habit.id);
  const done = completed.has(today);

  const columns =
    gridWidth > 0
      ? Math.max(1, Math.floor((gridWidth + DOT_GAP) / (DOT_SIZE + DOT_GAP)))
      : 0;
  const states =
    columns > 0
      ? buildRecentStates({
          completed,
          startDate: habit.start_date,
          days: columns * GRID_ROWS,
          today,
        })
      : [];

  const onGridLayout = (e: LayoutChangeEvent) =>
    setGridWidth(e.nativeEvent.layout.width);

  return (
    <Pressable
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
      onPress={() => router.push({ pathname: '/habit/[id]', params: { id: habit.id } })}>
      <View style={styles.top}>
        <View style={styles.iconWrap}>
          <SymbolView
            name={habitIcon(habit.icon)}
            size={22}
            tintColor={habit.color ?? theme.colors.ink}
          />
        </View>

        <View style={styles.info}>
          <Text style={styles.name} numberOfLines={1}>
            {habit.name}
          </Text>
          <Text style={styles.total}>{total}</Text>
        </View>

        <TodayToggle
          done={done}
          color={habit.color}
          onPress={() => toggleCompletion(habit.id, today)}
        />
      </View>

      <View style={styles.gridWrap} onLayout={onGridLayout}>
        {columns > 0 && (
          <DotGrid states={states} columns={columns} dotSize={DOT_SIZE} gap={DOT_GAP} />
        )}
      </View>
    </Pressable>
  );
});

const styles = StyleSheet.create((theme) => ({
  card: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.radius.lg,
    padding: theme.space.lg,
    gap: theme.space.lg,
  },
  pressed: {
    opacity: 0.9,
  },
  top: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.space.md,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: theme.radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.canvas,
  },
  info: {
    flex: 1,
    gap: 2,
  },
  name: {
    fontSize: theme.font.heading,
    fontWeight: theme.weight.semibold,
    color: theme.colors.textPrimary,
  },
  total: {
    fontSize: theme.font.caption,
    fontWeight: theme.weight.medium,
    color: theme.colors.textSecondary,
  },
  gridWrap: {
    width: '100%',
  },
}));
