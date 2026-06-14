import { observer } from '@legendapp/state/react';
import { type Href, useRouter } from 'expo-router';
import { useState } from 'react';
import { type LayoutChangeEvent, Pressable, Text, View } from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';

import { HabitGlyph } from '@/components/HabitGlyph';
import { useProGate } from '@/hooks/useProGate';
import { todayKey } from '@/lib/date';
import { buildRecentStates } from '@/lib/grid';
import {
  completedDates,
  markTrialIntroSeen,
  shouldShowTrialIntro,
  statsForHabit,
  toggleCompletion,
  type Habit,
} from '@/store';

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
  const gate = useProGate();
  const { theme } = useUnistyles();
  const [gridWidth, setGridWidth] = useState(0);

  const today = todayKey();
  const completed = completedDates(habit.id);
  // done days / active days elapsed — e.g. 1/1 (denominator + "days" in gray).
  const { total, days } = statsForHabit(habit.id, habit.start_date, habit.active_days);
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
          activeDays: habit.active_days,
        })
      : [];

  return (
    <Pressable
      style={({ pressed }) => [styles.card, (pressed || dragging) && styles.pressed]}
      accessibilityRole="button"
      accessibilityLabel={`${habit.name}, ${total} days completed`}
      onLongPress={onLongPress}
      delayLongPress={220}
      onPress={() => gate(() => router.push({ pathname: '/habit/[id]', params: { id: habit.id } }))}>
      <View style={styles.top}>
        <View style={styles.iconWrap}>
          <HabitGlyph icon={habit.icon} size={22} color={habit.color ?? theme.colors.ink} />
        </View>

        <View style={styles.info}>
          <Text style={styles.name} numberOfLines={1}>
            {habit.name}
          </Text>
          <View style={styles.totalRow}>
            <Text style={styles.total}>{total}</Text>
            <Text style={styles.totalLabel}>/ {days} days</Text>
          </View>
        </View>

        <TodayToggle
          done={done}
          color={habit.color}
          onPress={() =>
            gate(() => {
              const turningOn = !done;
              toggleCompletion(habit.id, today);
              // First time a new user marks anything: introduce the free trial.
              if (turningOn && shouldShowTrialIntro()) {
                markTrialIntroSeen();
                setTimeout(() => router.push('/paywall' as Href), 350);
              }
            })
          }
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
    alignItems: 'flex-start',
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
    fontSize: theme.font.title - 5,
    fontWeight: theme.weight.heavy,
    letterSpacing: -0.5,
    color: theme.colors.textPrimary,
  },
  // "/ 60 days" — denominator and label share one small, muted style.
  totalLabel: {
    fontSize: theme.font.caption,
    color: theme.colors.textMuted,
  },
  gridWrap: {
    width: '100%',
  },
}));
