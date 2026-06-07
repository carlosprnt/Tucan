import { observer } from '@legendapp/state/react';
import { useRouter } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useState } from 'react';
import { type LayoutChangeEvent, Pressable, Text, View } from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';

import { todayKey } from '@/lib/date';
import { buildRecentStates } from '@/lib/grid';
import { habitIcon } from '@/lib/icons';
import { completedDates, toggleCompletion, type Habit } from '@/store';

import { DottedSeparator } from './DottedSeparator';
import { DotGrid } from './DotGrid';
import { TodayToggle } from './TodayToggle';

const CELL = 11;
const GAP = 5;
const GRID_ROWS = 3;

export const HabitCard = observer(function HabitCard({
  habit,
  onLongPress,
  dragging,
}: {
  habit: Habit;
  onLongPress?: () => void;
  dragging?: boolean;
}) {
  const router = useRouter();
  const { theme } = useUnistyles();
  const [gridWidth, setGridWidth] = useState(0);

  const today = todayKey();
  const completed = completedDates(habit.id);
  const total = completed.size; // a completion is one row per day, so size == total
  const done = completed.has(today);

  const columns =
    gridWidth > 0 ? Math.max(1, Math.floor((gridWidth + GAP) / (CELL + GAP))) : 0;
  const states =
    columns > 0
      ? buildRecentStates({
          completed,
          startDate: habit.start_date,
          days: columns * GRID_ROWS,
          today,
        })
      : [];

  return (
    <Pressable
      style={({ pressed }) => [styles.card, (pressed || dragging) && styles.pressed]}
      accessibilityRole="button"
      accessibilityLabel={`${habit.name}, ${total} days completed`}
      onLongPress={onLongPress}
      delayLongPress={220}
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
          <View style={styles.totalRow}>
            <Text style={styles.total}>{total}</Text>
            <Text style={styles.totalLabel}>days</Text>
          </View>
        </View>

        <TodayToggle
          done={done}
          color={habit.color}
          onPress={() => toggleCompletion(habit.id, today)}
        />
      </View>

      <DottedSeparator />

      <View style={styles.gridWrap} onLayout={(e: LayoutChangeEvent) => setGridWidth(e.nativeEvent.layout.width)}>
        {columns > 0 && (
          <DotGrid
            states={states}
            columns={columns}
            cellSize={CELL}
            gap={GAP}
            color={habit.color}
          />
        )}
      </View>
    </Pressable>
  );
});

const styles = StyleSheet.create((theme) => ({
  card: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.radius.xl,
    padding: theme.space.xl,
    gap: theme.space.lg,
  },
  pressed: {
    opacity: 0.92,
  },
  top: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.space.md,
  },
  iconWrap: {
    width: 44,
    height: 44,
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
  totalRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: theme.space.xs,
  },
  total: {
    fontSize: theme.font.title,
    fontWeight: theme.weight.heavy,
    letterSpacing: -0.5,
    color: theme.colors.textPrimary,
  },
  totalLabel: {
    fontSize: theme.font.caption,
    color: theme.colors.textMuted,
  },
  gridWrap: {
    width: '100%',
  },
}));
