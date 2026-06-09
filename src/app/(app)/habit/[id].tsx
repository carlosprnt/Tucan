import '@/theme/unistyles';

import { observer, use$ } from '@legendapp/state/react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { DotsThreeVertical } from 'phosphor-react-native';
import { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  type SharedValue,
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
import { haptics } from '@/lib/haptics';
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
  header,
}: {
  months: Month[];
  habit: ReturnType<typeof getHabit> & {};
  completed: Set<DateKey>;
  today: DateKey;
  header: React.ReactNode;
}) {
  // Always show the skeleton when the calendar view opens, then reveal months
  // one at a time. (The Total view handles the instant cached re-entry.)
  const [revealed, setRevealed] = useState(0);
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
      <View style={styles.monthsWrap} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
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

// Total-view load: gray cascade then done cascade, ~1s overall.
const ACC_GRAY_MS = 500;
const ACC_DONE_MS = 500;
const ACC_FADE_MS = 180;

// Total-view zoom (spin + grow) cascade duration and size steps.
const ZOOM_MS = 1000;
const ZOOM_SCALES = [1, 1.3, 1.5]; // original → +30% → +20% more

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

  // Two-phase cascade (left→right, top→bottom) over 2s: first every glyph in
  // gray, then the completed ones fill in — done as an overlay on the gray base.
  const n = Math.max(1, days.length);
  const grayEnter = (i: number) =>
    animate ? FadeIn.delay((i / n) * ACC_GRAY_MS).duration(ACC_FADE_MS) : undefined;
  const doneEnter = (i: number) =>
    animate ? FadeIn.delay(ACC_GRAY_MS + (i / n) * ACC_DONE_MS).duration(ACC_FADE_MS) : undefined;

  // Tapping any glyph other than today's steps the zoom: original → +30% →
  // +20% more → original. Each step spins 90° and scales, cascading over 1s.
  const levelRef = useRef(0);
  const seq = useSharedValue(0);
  const fromScale = useSharedValue(1);
  const toScale = useSharedValue(1);
  const toggleZoom = () => {
    haptics.selection();
    const lv = levelRef.current;
    const next = (lv + 1) % ZOOM_SCALES.length;
    levelRef.current = next;
    fromScale.value = ZOOM_SCALES[lv];
    toScale.value = ZOOM_SCALES[next];
    seq.value = 0;
    seq.value = withTiming(1, { duration: ZOOM_MS, easing: Easing.linear });
  };

  return (
    <View style={styles.section}>
      <View style={styles.accStack}>
        {/* Base layer: gray (and today's outline) */}
        <View style={[styles.accGrid, { gap: GAP }]}>
          {days.map((key, i) => {
            const isToday = key === today;
            return (
              <ZoomCell
                key={key}
                i={i}
                n={n}
                seq={seq}
                fromScale={fromScale}
                toScale={toScale}
                entering={grayEnter(i)}
                onPress={isToday ? undefined : toggleZoom}>
                <Glyph size={CELL} state={isToday ? 'today' : 'missed'} color={accent} />
              </ZoomCell>
            );
          })}
        </View>
        {/* Done overlay: completed days fill in over the gray base */}
        <View style={[styles.accGrid, styles.accOverlay, { gap: GAP }]} pointerEvents="none">
          {days.map((key, i) =>
            completed.has(key) ? (
              <ZoomCell
                key={key}
                i={i}
                n={n}
                seq={seq}
                fromScale={fromScale}
                toScale={toScale}
                entering={doneEnter(i)}>
                <Glyph size={CELL} state="done" color={accent} />
              </ZoomCell>
            ) : (
              <View key={key} style={{ width: CELL, height: CELL }} />
            ),
          )}
        </View>
      </View>
    </View>
  );
}

/** A grid cell whose glyph spins 90° and scales from `fromScale` to `toScale`
 *  as `seq` sweeps, staggered by index so the effect cascades across the grid. */
function ZoomCell({
  i,
  n,
  seq,
  fromScale,
  toScale,
  entering,
  onPress,
  children,
}: {
  i: number;
  n: number;
  seq: SharedValue<number>;
  fromScale: SharedValue<number>;
  toScale: SharedValue<number>;
  entering?: ReturnType<typeof FadeIn.delay>;
  onPress?: () => void;
  children: React.ReactNode;
}) {
  const animStyle = useAnimatedStyle(() => {
    const window = 0.5; // each glyph's transition spans half of the sweep
    const start = (i / n) * (1 - window);
    const p = Math.min(1, Math.max(0, (seq.value - start) / window));
    const scale = fromScale.value + (toScale.value - fromScale.value) * p;
    return { transform: [{ scale }, { rotate: `${90 * p}deg` }] };
  });
  return (
    <Animated.View entering={entering} style={styles.zoomCell}>
      <Animated.View style={[styles.zoomInner, animStyle]}>
        {onPress ? (
          <Pressable onPress={onPress} style={styles.cellPress}>
            {children}
          </Pressable>
        ) : (
          children
        )}
      </Animated.View>
    </Animated.View>
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
  const name = fromDateKey(`${year}-${String(month + 1).padStart(2, '0')}-01`).toLocaleDateString(
    undefined,
    { month: 'long' },
  );
  return name.charAt(0).toUpperCase() + name.slice(1);
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
    paddingTop: theme.space.xl, // 24px from the top of the modal
    paddingBottom: rt.insets.bottom + 110,
    gap: theme.space.xl,
  },
  listHeader: {
    gap: theme.space.xl,
  },
  monthsWrap: {
    gap: theme.space.xxl, // ≥32px between months
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
    alignItems: 'flex-end', // hug the right edge so the icon sits at the 24px margin
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
  accStack: {
    position: 'relative',
  },
  accGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap', // full width (24px content margins), left-aligned
  },
  cellPress: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  zoomCell: {
    width: CELL,
    height: CELL,
  },
  zoomInner: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  accOverlay: {
    ...StyleSheet.absoluteFillObject,
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
