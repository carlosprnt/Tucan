import '@/theme/unistyles';

import { observer, use$ } from '@legendapp/state/react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { DotsThreeVertical } from 'phosphor-react-native';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';

import { DetailActionBar } from '@/components/DetailActionBar';
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
  // True if this habit was already opened earlier this session — its data is
  // cached, so render it instantly (no skeleton / no entrance cascade).
  const cached = id ? loadedHabits.has(id) : false;

  useEffect(() => {
    detailUI$.habitId.set(id ?? null);
    detailUI$.mode.set('accumulation'); // open on the year/Total view first
    return () => {
      detailUI$.habitId.set(null);
      detailUI$.mode.set('accumulation');
      if (id) loadedHabits.add(id); // mark loaded for instant re-entry
    };
  }, [id]);

  const habit = id ? getHabit(id) : undefined;

  if (!habit) {
    return (
      <View style={styles.screen}>
        <Header title="" />
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
        <MonthScroll
          months={months}
          habit={habit}
          completed={completed}
          today={today}
          cached={cached}
          header={
            <View style={styles.listHeader}>
              <Header
                title={habit.name}
                onEdit={() => router.push({ pathname: '/habit/new', params: { id: habit.id } })}
              />
              <Summary total={stats.total} days={stats.days} percent={stats.percent} />
            </View>
          }
        />
      ) : (
        <ScrollView
          style={styles.container}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}>
          <Header
            title={habit.name}
            onEdit={() => router.push({ pathname: '/habit/new', params: { id: habit.id } })}
          />
          <Summary total={stats.total} days={stats.days} percent={stats.percent} />
          <Accumulation
            completed={completed}
            startDate={habit.start_date}
            today={today}
            activeDays={habit.active_days}
            accent={accent}
            animate={!cached}
          />
        </ScrollView>
      )}

      <DetailActionBar
        done={completed.has(today)}
        color={habit.color}
        onToggleToday={() => toggleCompletion(habit.id, today)}
        mode={mode}
        onToggleMode={() => detailUI$.mode.set(mode === 'month' ? 'accumulation' : 'month')}
        onClose={() => router.back()}
      />
    </View>
  );
});

export default HabitDetail;

type Month = { year: number; month: number };

// Habit ids opened earlier this session — re-entering them skips the skeleton
// and entrance cascade and shows the data right away.
const loadedHabits = new Set<string>();

/**
 * Vertical month list that reveals the current month immediately, then fills in
 * older months one at a time — each shows a skeleton until it's rendered, so
 * entering a habit is instant with no blank gaps.
 */
function MonthScroll({
  months,
  habit,
  completed,
  today,
  cached,
  header,
}: {
  months: Month[];
  habit: ReturnType<typeof getHabit> & {};
  completed: Set<DateKey>;
  today: DateKey;
  cached: boolean;
  header: React.ReactNode;
}) {
  // Cached habits render every month right away — no skeleton on re-entry.
  // First-time habits hold the skeleton, then reveal one month at a time.
  const [revealed, setRevealed] = useState(cached ? months.length : 0);
  // Measure once so every month renders immediately at the right size (no
  // self-measure frame, so the real month replaces its skeleton with no flash).
  const [width, setWidth] = useState(0);

  useEffect(() => {
    if (revealed >= months.length) return;
    const delay = revealed === 0 ? 2000 : 45;
    const t = setTimeout(() => setRevealed((r) => r + 1), delay);
    return () => clearTimeout(t);
  }, [revealed, months.length]);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}>
      {header}
      <View onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
        {months.map((m, i) =>
          i < revealed ? (
            <View key={`${m.year}-${m.month}`} style={styles.monthBlock}>
              <Text style={styles.monthLabel}>
                <Text style={styles.monthName}>{monthName(m.year, m.month)}</Text>{' '}
                <Text style={styles.monthYear}>{m.year}</Text>
              </Text>
              <MonthCalendar
                year={m.year}
                month={m.month}
                completed={completed}
                startDate={habit.start_date}
                today={today}
                color={habit.color}
                activeDays={habit.active_days}
                animate={false}
                width={width || undefined}
                onToggleDay={(key) => toggleCompletion(habit.id, key)}
              />
            </View>
          ) : (
            <MonthSkeleton key={`${m.year}-${m.month}`} width={width} />
          ),
        )}
      </View>
    </ScrollView>
  );
}

const CELL = 18;
const GAP = 8;

const WEEKDAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S']; // Monday-first
const WEEKDAY_COUNT = 7;
const SKELETON_DAYS = 32; // default placeholder days per month
const CASCADE_STEP = 110; // ms between each row's blink (top → bottom)

// Rows of 7 covering 32 cells: [7,7,7,7,4].
const SKELETON_ROWS: number[] = (() => {
  const rows: number[] = [];
  for (let n = SKELETON_DAYS; n > 0; n -= WEEKDAY_COUNT) rows.push(Math.min(WEEKDAY_COUNT, n));
  return rows;
})();

/** A looping fade (blink), delayed so rows ripple downward in a cascade. */
function usePulse(delay: number) {
  const opacity = useSharedValue(0.3);
  useEffect(() => {
    opacity.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(1, { duration: 550 }),
          withTiming(0.3, { duration: 550 }),
        ),
        -1,
        false,
      ),
    );
  }, [delay, opacity]);
  return useAnimatedStyle(() => ({ opacity: opacity.value }));
}

function SkeletonLabel({ delay }: { delay: number }) {
  return <Animated.View style={[styles.skeletonLabelBar, usePulse(delay)]} />;
}

function SkeletonRow({
  delay,
  cells,
  cellSize,
  dot,
}: {
  delay: number;
  cells: number;
  cellSize: number;
  dot: number;
}) {
  const style = usePulse(delay);
  return (
    <Animated.View style={[styles.skeletonRow, { gap: GAP, marginBottom: GAP }, style]}>
      {Array.from({ length: cells }).map((_, i) => (
        <View key={i} style={{ width: cellSize, height: cellSize, alignItems: 'center', justifyContent: 'center' }}>
          <View style={[styles.skeletonDot, { width: dot, height: dot, borderRadius: dot / 2 }]} />
        </View>
      ))}
    </Animated.View>
  );
}

/** Per-month placeholder: a label bar + 32 dots, blinking in a downward cascade. */
function MonthSkeleton({ width }: { width: number }) {
  const cellSize = width > 0 ? Math.floor((width - GAP * (WEEKDAY_COUNT - 1)) / WEEKDAY_COUNT) : 0;
  const dot = Math.max(6, Math.round(cellSize * 0.5));

  return (
    <View style={styles.monthBlock}>
      <SkeletonLabel delay={0} />
      {/* Fixed weekday header — matches the real calendar so there's no jump. */}
      <View style={[styles.skeletonRow, { gap: GAP, marginBottom: GAP }]}>
        {WEEKDAYS.map((w, i) => (
          <View key={i} style={{ width: cellSize, alignItems: 'center' }}>
            <Text style={styles.weekday}>{w}</Text>
          </View>
        ))}
      </View>
      {width > 0 &&
        SKELETON_ROWS.map((cells, r) => (
          <SkeletonRow
            key={r}
            delay={(r + 1) * CASCADE_STEP}
            cells={cells}
            cellSize={cellSize}
            dot={dot}
          />
        ))}
    </View>
  );
}

function Accumulation({
  completed,
  startDate,
  today,
  activeDays,
  accent,
  animate,
}: {
  completed: Set<DateKey>;
  startDate: DateKey;
  today: DateKey;
  activeDays: number;
  accent: string;
  animate: boolean;
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
          <Animated.View
            key={key}
            entering={animate ? cascadeIn(i) : undefined}
            style={{ width: CELL, height: CELL }}>
            <Glyph
              size={CELL}
              state={completed.has(key) ? 'done' : key === today ? 'today' : 'missed'}
              color={accent}
            />
          </Animated.View>
        ))}
      </View>
    </View>
  );
}

function Header({ title, onEdit }: { title: string; onEdit?: () => void }) {
  const { theme } = useUnistyles();
  return (
    <View style={styles.headerRow}>
      <Text style={styles.headerTitle} numberOfLines={1}>
        {title}
      </Text>
      {onEdit && (
        <Pressable hitSlop={12} onPress={onEdit} accessibilityRole="button" accessibilityLabel="Edit habit" style={styles.iconBtn}>
          <DotsThreeVertical size={26} weight="bold" color={theme.colors.textSecondary} />
        </Pressable>
      )}
    </View>
  );
}

/** Muted sentences with the numbers emphasized in ink. */
function Summary({ total, days, percent }: { total: number; days: number; percent: number }) {
  return (
    <View style={styles.summary}>
      <Text style={styles.summaryLine}>
        <Text style={styles.summaryValue}>{days}</Text> days total
      </Text>
      <Text style={styles.summaryLine}>
        <Text style={styles.summaryValue}>{total}</Text> days completed
      </Text>
      <Text style={styles.summaryLine}>
        <Text style={styles.summaryValue}>{percent}%</Text> of days since you started
      </Text>
    </View>
  );
}

function monthName(year: number, month: number): string {
  return fromDateKey(`${year}-${String(month + 1).padStart(2, '0')}-01`).toLocaleDateString(
    undefined,
    { month: 'long' },
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
    paddingHorizontal: theme.space.xl, // 24px side margins
    paddingTop: theme.space.lg, // modal sheet: sit near the top with a clean margin
    paddingBottom: rt.insets.bottom + 110,
    gap: theme.space.xl,
  },
  listHeader: {
    gap: theme.space.xl,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: {
    flex: 1,
    textAlign: 'left',
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
  skeletonRow: {
    flexDirection: 'row',
  },
  skeletonLabelBar: {
    width: 120,
    height: theme.font.heading,
    borderRadius: theme.radius.sm,
    backgroundColor: theme.colors.dotMissed,
  },
  skeletonDot: {
    backgroundColor: theme.colors.dotMissed,
  },
  weekday: {
    fontSize: theme.font.caption,
    color: theme.colors.textMuted,
  },
  monthLabel: {
    fontSize: theme.font.body,
  },
  monthName: {
    fontSize: theme.font.body,
    fontWeight: theme.weight.bold,
    color: theme.colors.textPrimary,
  },
  monthYear: {
    fontSize: theme.font.body,
    color: theme.colors.textSecondary,
  },
  accGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
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
