import '@/theme/unistyles';

import { observer, use$ } from '@legendapp/state/react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useEffect } from 'react';
import { FlatList, Pressable, ScrollView, Text, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';

import { Glyph } from '@/components/Glyph';
import { MonthCalendar } from '@/components/MonthCalendar';
import { cascadeIn } from '@/lib/anim';
import { addDays, daysBetween, fromDateKey, isActiveDay, todayKey, type DateKey } from '@/lib/date';
import {
  completedDates,
  detailUI$,
  getHabit,
  statsForHabit,
  toggleCompletion,
} from '@/store';

const HabitDetail = observer(function HabitDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { theme } = useUnistyles();

  const mode = use$(detailUI$.mode);

  useEffect(() => {
    detailUI$.habitId.set(id ?? null);
    detailUI$.mode.set('month');
    return () => {
      detailUI$.habitId.set(null);
    };
  }, [id]);

  const habit = id ? getHabit(id) : undefined;

  if (!habit) {
    return (
      <View style={styles.screen}>
        <Header title="" onBack={() => router.back()} />
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
  const stats = statsForHabit(habit.id, habit.start_date, habit.active_days);
  const accent = habit.color ?? theme.colors.ink;
  const months = monthsDescending(habit.start_date, today);

  return (
    <View style={styles.screen}>
      {mode === 'month' ? (
        // Virtualized so long histories render only the visible months.
        <FlatList
          style={styles.container}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          data={months}
          keyExtractor={(m) => `${m.year}-${m.month}`}
          initialNumToRender={2}
          windowSize={5}
          removeClippedSubviews
          ListHeaderComponent={
            <View style={styles.listHeader}>
              <Header
                title={habit.name}
                onBack={() => router.back()}
                onEdit={() => router.push({ pathname: '/habit/new', params: { id: habit.id } })}
              />
              <Summary total={stats.total} percent={stats.percent} />
              <Text style={styles.hint}>Tap any past day to fill it in.</Text>
            </View>
          }
          renderItem={({ item }) => (
            <View style={styles.monthBlock}>
              <Text style={styles.monthLabel}>{monthLabel(item.year, item.month)}</Text>
              <MonthCalendar
                year={item.year}
                month={item.month}
                completed={completed}
                startDate={habit.start_date}
                today={today}
                color={habit.color}
                activeDays={habit.active_days}
                animate={false}
                onToggleDay={(key) => toggleCompletion(habit.id, key)}
              />
            </View>
          )}
        />
      ) : (
        <ScrollView
          style={styles.container}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}>
          <Header
            title={habit.name}
            onBack={() => router.back()}
            onEdit={() => router.push({ pathname: '/habit/new', params: { id: habit.id } })}
          />
          <Summary total={stats.total} percent={stats.percent} />
          <Accumulation
            completed={completed}
            startDate={habit.start_date}
            today={today}
            activeDays={habit.active_days}
            accent={accent}
          />
        </ScrollView>
      )}
    </View>
  );
});

export default HabitDetail;

const CELL = 18;
const GAP = 8;

function Accumulation({
  completed,
  startDate,
  today,
  activeDays,
  accent,
}: {
  completed: Set<DateKey>;
  startDate: DateKey;
  today: DateKey;
  activeDays: number;
  accent: string;
}) {
  // Every ACTIVE day from start through today: done (accent) or not done (gray).
  const count = Math.max(1, daysBetween(startDate, today) + 1);
  const days: DateKey[] = [];
  for (let i = 0; i < count; i++) {
    const key = addDays(startDate, i);
    if (isActiveDay(activeDays, key)) days.push(key);
  }

  return (
    <View style={styles.section}>
      <View style={[styles.accGrid, { gap: GAP }]}>
        {days.map((key, i) => (
          <Animated.View key={key} entering={cascadeIn(i)} style={{ width: CELL, height: CELL }}>
            <Glyph size={CELL} state={completed.has(key) ? 'done' : 'missed'} color={accent} />
          </Animated.View>
        ))}
      </View>
    </View>
  );
}

function Header({
  title,
  onBack,
  onEdit,
}: {
  title: string;
  onBack: () => void;
  onEdit?: () => void;
}) {
  const { theme } = useUnistyles();
  return (
    <View style={styles.headerRow}>
      <Pressable hitSlop={12} onPress={onBack} accessibilityRole="button" accessibilityLabel="Back" style={styles.iconBtn}>
        <SymbolView name="chevron.left" size={22} tintColor={theme.colors.textPrimary} />
      </Pressable>
      <Text style={styles.headerTitle} numberOfLines={1}>
        {title}
      </Text>
      {onEdit ? (
        <Pressable hitSlop={12} onPress={onEdit} accessibilityRole="button" accessibilityLabel="Edit habit" style={styles.iconBtn}>
          <SymbolView name="square.and.pencil" size={22} weight="semibold" tintColor={theme.colors.textPrimary} />
        </Pressable>
      ) : (
        <View style={styles.iconBtn} />
      )}
    </View>
  );
}

/** Two muted sentences with the number/percent emphasized in ink. */
function Summary({ total, percent }: { total: number; percent: number }) {
  return (
    <View style={styles.summary}>
      <Text style={styles.summaryLine}>
        <Text style={styles.summaryValue}>{total}</Text> days completed
      </Text>
      <Text style={styles.summaryLine}>
        <Text style={styles.summaryValue}>{percent}%</Text> of days since you started
      </Text>
    </View>
  );
}

function monthLabel(year: number, month: number): string {
  return fromDateKey(`${year}-${String(month + 1).padStart(2, '0')}-01`).toLocaleDateString(
    undefined,
    { month: 'long', year: 'numeric' },
  );
}

/** Months from today's month back to the start month, newest first. */
function monthsDescending(startDate: DateKey, today: DateKey): { year: number; month: number }[] {
  const start = fromDateKey(startDate);
  const end = fromDateKey(today);
  const startY = start.getFullYear();
  const startM = start.getMonth();
  const months: { year: number; month: number }[] = [];
  let y = end.getFullYear();
  let m = end.getMonth();
  while (y > startY || (y === startY && m >= startM)) {
    months.push({ year: y, month: m });
    m -= 1;
    if (m < 0) {
      m = 11;
      y -= 1;
    }
  }
  return months;
}

const styles = StyleSheet.create((theme, rt) => ({
  screen: {
    flex: 1,
    backgroundColor: theme.colors.canvas,
  },
  container: {
    flex: 1,
  },
  content: {
    paddingHorizontal: theme.space.lg,
    paddingTop: rt.insets.top + theme.space.sm,
    paddingBottom: rt.insets.bottom + 110,
    gap: theme.space.xl,
  },
  listHeader: {
    gap: theme.space.xl,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: {
    flex: 1,
    textAlign: 'left',
    marginLeft: theme.space.xl,
    fontSize: theme.font.title,
    fontWeight: theme.weight.bold,
    letterSpacing: -0.5,
    color: theme.colors.textPrimary,
  },
  iconBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summary: {
    gap: theme.space.xs,
  },
  summaryLine: {
    fontSize: theme.font.body,
    color: theme.colors.textSecondary,
  },
  summaryValue: {
    fontWeight: theme.weight.bold,
    color: theme.colors.textPrimary,
  },
  section: {
    gap: theme.space.xl,
  },
  monthBlock: {
    gap: theme.space.md,
  },
  monthLabel: {
    fontSize: theme.font.heading,
    fontWeight: theme.weight.semibold,
    color: theme.colors.textPrimary,
  },
  accGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
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
    paddingHorizontal: theme.space.lg,
    paddingTop: theme.space.xl,
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
