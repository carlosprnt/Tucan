import { observer } from '@legendapp/state/react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useState } from 'react';
import { type LayoutChangeEvent, Pressable, Text, View } from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';

import { DotGrid } from '@/components/DotGrid';
import { todayKey } from '@/lib/date';
import { buildRecentStates } from '@/lib/grid';
import { habitIcon } from '@/lib/icons';
import { completedDates, getHabit, statsForHabit } from '@/store';

// Partial detail screen — the Month/Accumulation toggle and editable grid are
// built in the next step. Shows the header stats and a recent grid for now.
const HabitDetail = observer(function HabitDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { theme } = useUnistyles();
  const [gridWidth, setGridWidth] = useState(0);

  const habit = id ? getHabit(id) : undefined;

  if (!habit) {
    return (
      <View style={styles.container}>
        <Header onBack={() => router.back()} />
        <Text style={styles.missing}>Habit not found.</Text>
      </View>
    );
  }

  const onEdit = () =>
    router.push({ pathname: '/habit/new', params: { id: habit.id } });

  const stats = statsForHabit(habit.id, habit.start_date);
  const dotSize = 12;
  const gap = 6;
  const columns =
    gridWidth > 0 ? Math.max(1, Math.floor((gridWidth + gap) / (dotSize + gap))) : 0;
  const states =
    columns > 0
      ? buildRecentStates({
          completed: completedDates(habit.id),
          startDate: habit.start_date,
          days: columns * 7,
          today: todayKey(),
        })
      : [];

  return (
    <View style={styles.container}>
      <Header onBack={() => router.back()} onEdit={onEdit} />

      <View style={styles.heading}>
        <View style={styles.iconWrap}>
          <SymbolView
            name={habitIcon(habit.icon)}
            size={28}
            tintColor={habit.color ?? theme.colors.ink}
          />
        </View>
        <Text style={styles.name}>{habit.name}</Text>
      </View>

      <View style={styles.stats}>
        <Stat value={String(stats.total)} label="completed" />
        <Stat value={`${stats.percent}%`} label="since start" />
      </View>

      <View style={styles.gridWrap} onLayout={(e: LayoutChangeEvent) => setGridWidth(e.nativeEvent.layout.width)}>
        {columns > 0 && (
          <DotGrid states={states} columns={columns} dotSize={dotSize} gap={gap} />
        )}
      </View>
    </View>
  );
});

export default HabitDetail;

function Header({ onBack, onEdit }: { onBack: () => void; onEdit?: () => void }) {
  const { theme } = useUnistyles();
  return (
    <View style={styles.headerRow}>
      <Pressable hitSlop={12} onPress={onBack} style={styles.back}>
        <SymbolView name="chevron.left" size={22} tintColor={theme.colors.textPrimary} />
      </Pressable>
      {onEdit && (
        <Pressable hitSlop={12} onPress={onEdit} style={styles.back}>
          <SymbolView name="slider.horizontal.3" size={20} tintColor={theme.colors.textPrimary} />
        </Pressable>
      )}
    </View>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create((theme, rt) => ({
  container: {
    flex: 1,
    backgroundColor: theme.colors.canvas,
    paddingHorizontal: theme.space.lg,
    paddingTop: rt.insets.top + theme.space.sm,
    gap: theme.space.xl,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  back: {
    width: 40,
    height: 40,
    justifyContent: 'center',
  },
  heading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.space.md,
  },
  iconWrap: {
    width: 48,
    height: 48,
    borderRadius: theme.radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.card,
  },
  name: {
    flex: 1,
    fontSize: theme.font.title,
    fontWeight: theme.weight.bold,
    color: theme.colors.textPrimary,
  },
  stats: {
    flexDirection: 'row',
    gap: theme.space.xxxl,
  },
  stat: {
    gap: 2,
  },
  statValue: {
    fontSize: theme.font.display,
    fontWeight: theme.weight.bold,
    color: theme.colors.textPrimary,
  },
  statLabel: {
    fontSize: theme.font.caption,
    color: theme.colors.textSecondary,
  },
  gridWrap: {
    width: '100%',
  },
  missing: {
    fontSize: theme.font.body,
    color: theme.colors.textSecondary,
  },
}));
