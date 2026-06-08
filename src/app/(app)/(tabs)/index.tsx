import '@/theme/unistyles';

import { observer } from '@legendapp/state/react';
import { useRouter } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import DraggableFlatList, {
  ScaleDecorator,
  type RenderItemParams,
} from 'react-native-draggable-flatlist';
import Animated, { FadeIn, FadeInDown, FadeOut, FadeOutUp } from 'react-native-reanimated';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';

import { HabitCard } from '@/components/HabitCard';
import { OverviewCard } from '@/components/OverviewCard';
import { TopFade } from '@/components/TopFade';
import { haptics } from '@/lib/haptics';
import {
  isStoreHydrated,
  listHabits,
  reorderHabits,
  statsForHabit,
  totalForHabit,
  type Habit,
} from '@/store';

const ENTER = FadeIn.duration(260);
const EXIT = FadeOut.duration(140);

const Home = observer(function Home() {
  const { rt } = useUnistyles();
  const habits = listHabits();
  const hydrated = isStoreHydrated();
  const [overview, setOverview] = useState(false);

  const renderItem = ({ item, drag, isActive }: RenderItemParams<Habit>) => (
    <ScaleDecorator activeScale={1.03}>
      <Animated.View
        key={overview ? 'overview' : 'list'}
        entering={ENTER}
        exiting={EXIT}
        style={styles.item}>
        {overview ? (
          <OverviewCard habit={item} />
        ) : (
          <HabitCard habit={item} onLongPress={drag} dragging={isActive} />
        )}
      </Animated.View>
    </ScaleDecorator>
  );

  return (
    <View style={styles.screen}>
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
          <Header overview={overview} onToggle={() => setOverview((o) => !o)} habits={habits} />
        }
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        ListEmptyComponent={hydrated ? <EmptyState /> : <SkeletonList />}
      />

      <TopFade height={rt.insets.top + 28} />
    </View>
  );
});

export default Home;

function Header({
  overview,
  onToggle,
  habits,
}: {
  overview: boolean;
  onToggle: () => void;
  habits: Habit[];
}) {
  const { theme } = useUnistyles();
  return (
    <View style={styles.header}>
      <View style={styles.headerRow}>
        <View style={styles.titleBlock}>
          <Text style={styles.title}>Your habits</Text>
          {overview && (
            <Animated.Text
              entering={FadeInDown.duration(220)}
              exiting={FadeOutUp.duration(140)}
              style={styles.subtitle}>
              Overview
            </Animated.Text>
          )}
        </View>
        <Pressable
          hitSlop={12}
          onPress={() => {
            haptics.selection();
            onToggle();
          }}
          accessibilityRole="button"
          accessibilityLabel={overview ? 'Show list' : 'Show overview'}
          accessibilityState={{ selected: overview }}>
          <SymbolView
            name={overview ? 'square.grid.2x2.fill' : 'chart.bar.fill'}
            size={24}
            tintColor={overview ? theme.colors.ink : theme.colors.textSecondary}
          />
        </Pressable>
      </View>

      {overview && habits.length > 0 && (
        <Animated.View entering={FadeInDown.duration(260)} exiting={FadeOutUp.duration(160)}>
          <Summary habits={habits} />
        </Animated.View>
      )}
    </View>
  );
}

const Summary = observer(function Summary({ habits }: { habits: Habit[] }) {
  const totalAll = habits.reduce((sum, h) => sum + totalForHabit(h.id), 0);
  const avgPercent = habits.length
    ? Math.round(
        habits.reduce((sum, h) => sum + statsForHabit(h.id, h.start_date).percent, 0) /
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

function SkeletonList() {
  return (
    <View style={styles.skeletonList}>
      {[0, 1, 2].map((i) => (
        <View key={i} style={styles.skeletonCard} />
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
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  titleBlock: {
    flexShrink: 1,
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
  skeletonList: {
    gap: theme.space.md,
  },
  skeletonCard: {
    height: 132,
    borderRadius: theme.radius.xl,
    backgroundColor: theme.colors.card,
    opacity: 0.6,
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
