import '@/theme/unistyles';

import { observer, use$ } from '@legendapp/state/react';
import { BlurView } from 'expo-blur';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Animated as RNAnimated, Pressable, Text, View } from 'react-native';
import DraggableFlatList, {
  ScaleDecorator,
  type RenderItemParams,
} from 'react-native-draggable-flatlist';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';

import { HabitCard } from '@/components/HabitCard';
import { ChipSkeleton, HabitCardSkeleton } from '@/components/HabitCardSkeleton';
import { OverviewCard } from '@/components/OverviewCard';
import { TopFade } from '@/components/TopFade';
import { daysBetween, isActiveDay, todayKey } from '@/lib/date';
import { haptics } from '@/lib/haptics';
import {
  completedDates,
  homeUI$,
  isHabitsReady,
  listHabits,
  reorderHabits,
  statsForHabit,
  totalForHabit,
  type Habit,
} from '@/store';

// Driven by React Native's Animated (NOT Reanimated): animating the native
// `intensity` prop through Reanimated's worklet commit path segfaults on Fabric
// (cloneShadowTreeWithNewProps → folly::dynamic). RN's Animated uses a separate
// prop-update path and is the supported way to animate blur intensity.
const AnimatedBlurView = RNAnimated.createAnimatedComponent(BlurView);
const MAX_BLUR = 48;
// Minimum time the first-entry skeleton stays up, so it's always perceptible
// even when the local (synchronous MMKV) cache resolves instantly.
const BOOT_MIN_MS = 650;

const Home = observer(function Home() {
  const { rt } = useUnistyles();
  const habits = listHabits();
  const ready = isHabitsReady();
  // Data is "resolved" once we have habits OR the first remote pull finished.
  const dataPending = !ready && habits.length === 0;
  // Single boot gate: drives the first-entry skeleton AND the bar's entrance.
  const booted = use$(homeUI$.booted);
  const overview = use$(homeUI$.overview);
  // What's actually rendered. It lags the toggle, swapping at the blur's peak.
  const [displayed, setDisplayed] = useState(overview);

  // Boot: reveal real content once the data has resolved AND the skeleton has
  // shown for at least BOOT_MIN_MS. Flipping `booted` swaps the skeleton for the
  // list and triggers the bottom bar's entrance.
  const bootStartedAt = useRef(Date.now());
  useEffect(() => {
    if (booted || dataPending) return;
    const remaining = Math.max(0, BOOT_MIN_MS - (Date.now() - bootStartedAt.current));
    const t = setTimeout(() => homeUI$.booted.set(true), remaining);
    return () => clearTimeout(t);
  }, [booted, dataPending]);

  // Today's progress: of the habits scheduled today, how many are checked.
  const todayLabel = todayProgressLabel(habits);

  // Toggle transition: blur the current view in (450ms), swap to the new view
  // at the peak, then ease the blur back out (500ms) revealing it.
  const intensity = useRef(new RNAnimated.Value(0)).current;
  const firstRender = useRef(true);
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    intensity.stopAnimation();
    RNAnimated.timing(intensity, {
      toValue: MAX_BLUR,
      duration: 450,
      useNativeDriver: false,
    }).start(({ finished }) => {
      if (!finished) return; // superseded by a faster re-toggle
      setDisplayed(overview); // swap content while it's hidden behind the blur
      RNAnimated.timing(intensity, {
        toValue: 0,
        duration: 500,
        useNativeDriver: false,
      }).start();
    });
  }, [overview, intensity]);

  const renderItem = ({ item, drag, isActive }: RenderItemParams<Habit>) => (
    <ScaleDecorator activeScale={1.03}>
      <Animated.View key={displayed ? 'overview' : 'list'} style={styles.item}>
        {displayed ? (
          <OverviewCard habit={item} onLongPress={drag} />
        ) : (
          <HabitCard habit={item} onLongPress={drag} dragging={isActive} />
        )}
      </Animated.View>
    </ScaleDecorator>
  );

  return (
    <View style={styles.screen}>
      {booted && (
        <DraggableFlatList
          data={habits}
          keyExtractor={(h) => h.id}
          renderItem={renderItem}
          onDragBegin={() => haptics.medium()}
          onDragEnd={({ data }) => reorderHabits(data.map((h) => h.id))}
          activationDistance={12}
          containerStyle={styles.screen}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            <Header overview={displayed} habits={habits} todayLabel={todayLabel} loading={false} />
          }
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          ListEmptyComponent={<EmptyState />}
        />
      )}

      {/* First-entry skeleton overlay: fixed "Your habits" title + chip skeleton
          + cards. When booted flips, it fades to 0 over the real content. */}
      {!booted && (
        <Animated.View
          pointerEvents="none"
          exiting={FadeOut.duration(280)}
          style={styles.skeletonOverlay}>
          <Header overview={false} habits={[]} todayLabel={null} loading />
          <SkeletonList />
        </Animated.View>
      )}

      <TopFade height={rt.insets.top + 28} />

      <AnimatedBlurView
        pointerEvents="none"
        tint={rt.themeName === 'dark' ? 'dark' : 'light'}
        intensity={intensity}
        style={styles.blurOverlay}
      />
    </View>
  );
});

export default Home;

function Header({
  overview,
  habits,
  todayLabel,
  loading,
}: {
  overview: boolean;
  habits: Habit[];
  todayLabel: string | null;
  loading: boolean;
}) {
  return (
    <View style={styles.header}>
      <View style={styles.titleRow}>
        <View style={styles.titleBlock}>
          <Text style={styles.title}>Your habits</Text>
          {overview && <Text style={styles.subtitle}>Overview</Text>}
        </View>
        {loading ? (
          <ChipSkeleton />
        ) : todayLabel ? (
          <Text style={styles.todayProgress}>{todayLabel}</Text>
        ) : null}
      </View>

      {overview && habits.length > 0 && <Summary habits={habits} />}
    </View>
  );
}

const Summary = observer(function Summary({ habits }: { habits: Habit[] }) {
  const totalAll = habits.reduce((sum, h) => sum + totalForHabit(h.id), 0);
  const avgPercent = habits.length
    ? Math.round(
        habits.reduce((sum, h) => sum + statsForHabit(h.id, h.start_date, h.active_days).percent, 0) /
          habits.length,
      )
    : 0;

  return (
    <View style={styles.summary}>
      <Stat value={String(totalAll)} label="completions" />
      <Stat value={`${avgPercent}%`} label="avg. completion" />
    </View>
  );
});

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

/** "All done" / "60% done" for the habits scheduled today, or null if none. */
function todayProgressLabel(habits: Habit[]): string | null {
  const today = todayKey();
  const due = habits.filter(
    (h) => isActiveDay(h.active_days, today) && daysBetween(h.start_date, today) >= 0,
  );
  if (due.length === 0) return null;
  const done = due.filter((h) => completedDates(h.id).has(today)).length;
  if (done === due.length) return 'All done';
  return `${Math.round((done / due.length) * 100)}% done`;
}

function SkeletonList() {
  return (
    <View style={styles.skeletonList}>
      {[0, 1, 2].map((i) => (
        <HabitCardSkeleton key={i} delay={i * 120} />
      ))}
    </View>
  );
}

function EmptyState() {
  const router = useRouter();
  return (
    <Animated.View entering={FadeIn.duration(300)} style={styles.empty}>
      <Text style={styles.emptyTitle}>Start your first habit</Text>
      <Text style={styles.emptyBody}>
        Pick one small thing to do daily. Mark it done and watch the grid fill in.
      </Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Add your first habit"
        style={({ pressed }) => [styles.emptyButton, pressed && styles.pressed]}
        onPress={() => {
          haptics.light();
          router.push('/habit/new');
        }}>
        <Text style={styles.emptyButtonText}>Add your first habit</Text>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create((theme, rt) => ({
  screen: {
    flex: 1,
    backgroundColor: theme.colors.canvas,
  },
  blurOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  content: {
    paddingHorizontal: theme.space.lg,
    paddingTop: rt.insets.top + theme.space.lg,
    paddingBottom: rt.insets.bottom + 96,
    flexGrow: 1,
  },
  header: {
    marginBottom: theme.space.md,
    gap: theme.space.lg,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.space.sm,
  },
  titleBlock: {
    flexShrink: 1,
  },
  todayProgress: {
    fontSize: theme.font.caption,
    fontWeight: theme.weight.medium,
    color: theme.colors.textPrimary,
    borderWidth: 1,
    borderColor: theme.colors.separator,
    borderRadius: theme.radius.pill,
    paddingHorizontal: theme.space.md,
    paddingVertical: theme.space.md,
    overflow: 'hidden',
  },
  title: {
    fontSize: theme.font.title,
    fontWeight: theme.weight.bold,
    letterSpacing: -0.5,
    color: theme.colors.textPrimary,
  },
  subtitle: {
    marginTop: 2,
    fontSize: theme.font.body,
    fontWeight: theme.weight.medium,
    color: theme.colors.textSecondary,
  },
  summary: {
    flexDirection: 'row',
    gap: theme.space.xxxl,
    paddingBottom: theme.space.xs,
  },
  stat: {
    gap: 2,
  },
  statValue: {
    fontSize: theme.font.display,
    fontWeight: theme.weight.heavy,
    letterSpacing: -1,
    color: theme.colors.textPrimary,
  },
  statLabel: {
    fontSize: theme.font.caption,
    color: theme.colors.textSecondary,
  },
  item: {
    width: '100%',
  },
  separator: {
    height: theme.space.md,
  },
  skeletonOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: theme.space.lg,
    paddingTop: rt.insets.top + theme.space.lg,
  },
  skeletonList: {
    gap: theme.space.md,
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.space.sm,
    paddingHorizontal: theme.space.xl,
  },
  emptyTitle: {
    fontSize: theme.font.title,
    fontWeight: theme.weight.bold,
    color: theme.colors.textPrimary,
  },
  emptyBody: {
    fontSize: theme.font.body,
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
  emptyButton: {
    marginTop: theme.space.lg,
    height: 52,
    paddingHorizontal: theme.space.xl,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyButtonText: {
    fontSize: theme.font.body,
    fontWeight: theme.weight.semibold,
    color: theme.colors.card,
  },
  pressed: {
    opacity: 0.8,
  },
}));
