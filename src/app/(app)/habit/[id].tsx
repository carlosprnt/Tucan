import '@/theme/unistyles';

import { observer } from '@legendapp/state/react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useState } from 'react';
import { type LayoutChangeEvent, Pressable, ScrollView, Text, View } from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';

import { DotGrid } from '@/components/DotGrid';
import { MonthCalendar } from '@/components/MonthCalendar';
import { fromDateKey, todayKey } from '@/lib/date';
import type { DotState } from '@/lib/grid';
import { haptics } from '@/lib/haptics';
import { habitIcon } from '@/lib/icons';
import { completedDates, getHabit, statsForHabit, toggleCompletion } from '@/store';

type ViewMode = 'month' | 'accumulation';

const HabitDetail = observer(function HabitDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { theme } = useUnistyles();

  const now = new Date();
  const [mode, setMode] = useState<ViewMode>('month');
  const [cursor, setCursor] = useState({ year: now.getFullYear(), month: now.getMonth() });

  const habit = id ? getHabit(id) : undefined;

  if (!habit) {
    return (
      <View style={styles.container}>
        <Header onBack={() => router.back()} />
        <View style={styles.notFound}>
          <Text style={styles.missing}>This habit no longer exists.</Text>
          <Pressable
            style={({ pressed }) => [styles.notFoundBtn, pressed && { opacity: 0.7 }]}
            onPress={() => router.replace('/')}>
            <Text style={styles.notFoundBtnText}>Back to Today</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  const today = todayKey();
  const completed = completedDates(habit.id);
  const stats = statsForHabit(habit.id, habit.start_date);
  const accent = habit.color ?? theme.colors.ink;

  const onEdit = () => router.push({ pathname: '/habit/new', params: { id: habit.id } });

  function shiftMonth(delta: number) {
    haptics.selection();
    setCursor((c) => {
      const d = new Date(c.year, c.month + delta, 1);
      return { year: d.getFullYear(), month: d.getMonth() };
    });
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}>
      <Header onBack={() => router.back()} onEdit={onEdit} />

      <View style={styles.heading}>
        <View style={styles.iconWrap}>
          <SymbolView name={habitIcon(habit.icon)} size={28} tintColor={accent} />
        </View>
        <Text style={styles.name}>{habit.name}</Text>
      </View>

      <View style={styles.stats}>
        <Stat value={String(stats.total)} label="completed" />
        <Stat value={`${stats.percent}%`} label="since start" />
      </View>

      <Segmented mode={mode} onChange={setMode} />

      {mode === 'month' ? (
        <View style={styles.section}>
          <View style={styles.monthNav}>
            <Pressable hitSlop={10} onPress={() => shiftMonth(-1)} accessibilityRole="button" accessibilityLabel="Previous month" style={styles.navBtn}>
              <SymbolView name="chevron.left" size={18} tintColor={theme.colors.textSecondary} />
            </Pressable>
            <Text style={styles.monthLabel}>{monthLabel(cursor.year, cursor.month)}</Text>
            <Pressable hitSlop={10} onPress={() => shiftMonth(1)} accessibilityRole="button" accessibilityLabel="Next month" style={styles.navBtn}>
              <SymbolView name="chevron.right" size={18} tintColor={theme.colors.textSecondary} />
            </Pressable>
          </View>
          <MonthCalendar
            year={cursor.year}
            month={cursor.month}
            completed={completed}
            startDate={habit.start_date}
            today={today}
            color={habit.color}
            onToggleDay={(key) => toggleCompletion(habit.id, key)}
          />
          <Text style={styles.hint}>Tap any past day to fill it in.</Text>
        </View>
      ) : (
        <Accumulation total={stats.total} percent={stats.percent} accent={accent} />
      )}
    </ScrollView>
  );
});

export default HabitDetail;

function Accumulation({
  total,
  percent,
  accent,
}: {
  total: number;
  percent: number;
  accent: string;
}) {
  const [width, setWidth] = useState(0);
  const dotSize = 12;
  const gap = 6;
  const columns =
    width > 0 ? Math.max(1, Math.floor((width + gap) / (dotSize + gap))) : 0;
  const states: DotState[] = Array.from({ length: total }, () => 'done');

  return (
    <View style={styles.section} onLayout={(e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width)}>
      {total === 0 ? (
        <Text style={styles.missing}>No dots yet — mark today done to start.</Text>
      ) : (
        columns > 0 && (
          <DotGrid states={states} columns={columns} cellSize={dotSize} gap={gap} color={accent} />
        )
      )}
      <Text style={styles.accFooter}>{percent}% of days since you started</Text>
    </View>
  );
}

function Header({ onBack, onEdit }: { onBack: () => void; onEdit?: () => void }) {
  const { theme } = useUnistyles();
  return (
    <View style={styles.headerRow}>
      <Pressable hitSlop={12} onPress={onBack} accessibilityRole="button" accessibilityLabel="Back" style={styles.iconBtn}>
        <SymbolView name="chevron.left" size={22} tintColor={theme.colors.textPrimary} />
      </Pressable>
      {onEdit && (
        <Pressable hitSlop={12} onPress={onEdit} accessibilityRole="button" accessibilityLabel="Edit habit" style={styles.iconBtn}>
          <SymbolView name="pencil" size={20} tintColor={theme.colors.textPrimary} />
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

function Segmented({ mode, onChange }: { mode: ViewMode; onChange: (m: ViewMode) => void }) {
  return (
    <View style={styles.segmented}>
      {(['month', 'accumulation'] as ViewMode[]).map((m) => (
        <Pressable
          key={m}
          accessibilityRole="radio"
          accessibilityState={{ selected: mode === m }}
          accessibilityLabel={m === 'month' ? 'Month' : 'All time'}
          onPress={() => {
            haptics.selection();
            onChange(m);
          }}
          style={[styles.segment, mode === m && styles.segmentActive]}>
          <Text style={[styles.segmentText, mode === m && styles.segmentTextActive]}>
            {m === 'month' ? 'Month' : 'All time'}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

function monthLabel(year: number, month: number): string {
  return fromDateKey(`${year}-${String(month + 1).padStart(2, '0')}-01`).toLocaleDateString(
    undefined,
    { month: 'long', year: 'numeric' },
  );
}

const styles = StyleSheet.create((theme, rt) => ({
  container: {
    flex: 1,
    backgroundColor: theme.colors.canvas,
  },
  content: {
    paddingHorizontal: theme.space.lg,
    paddingTop: rt.insets.top + theme.space.sm,
    paddingBottom: rt.insets.bottom + theme.space.xxxl,
    gap: theme.space.xl,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  iconBtn: {
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
  segmented: {
    flexDirection: 'row',
    backgroundColor: theme.colors.card,
    borderRadius: theme.radius.md,
    padding: 4,
    gap: 4,
  },
  segment: {
    flex: 1,
    paddingVertical: theme.space.sm,
    borderRadius: theme.radius.sm,
    alignItems: 'center',
  },
  segmentActive: {
    backgroundColor: theme.colors.canvas,
  },
  segmentText: {
    fontSize: theme.font.body,
    color: theme.colors.textSecondary,
  },
  segmentTextActive: {
    color: theme.colors.textPrimary,
    fontWeight: theme.weight.semibold,
  },
  section: {
    gap: theme.space.lg,
  },
  monthNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  navBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthLabel: {
    fontSize: theme.font.heading,
    fontWeight: theme.weight.semibold,
    color: theme.colors.textPrimary,
  },
  accFooter: {
    fontSize: theme.font.body,
    color: theme.colors.textSecondary,
  },
  hint: {
    fontSize: theme.font.caption,
    color: theme.colors.textMuted,
  },
  missing: {
    fontSize: theme.font.body,
    color: theme.colors.textSecondary,
  },
  notFound: {
    gap: theme.space.lg,
    alignItems: 'flex-start',
  },
  notFoundBtn: {
    height: 48,
    paddingHorizontal: theme.space.xl,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notFoundBtnText: {
    fontSize: theme.font.body,
    fontWeight: theme.weight.semibold,
    color: theme.colors.card,
  },
}));
