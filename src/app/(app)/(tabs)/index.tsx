import '@/theme/unistyles';

import { observer } from '@legendapp/state/react';
import { useRouter } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useState } from 'react';
import { FlatList, LayoutAnimation, Pressable, Text, View } from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';

import { HabitCard } from '@/components/HabitCard';
import { OverviewCard } from '@/components/OverviewCard';
import { haptics } from '@/lib/haptics';
import { isStoreHydrated, listHabits, statsForHabit, totalForHabit, type Habit } from '@/store';

const Home = observer(function Home() {
  const habits = listHabits();
  const hydrated = isStoreHydrated();
  const [overview, setOverview] = useState(false);

  function toggleOverview() {
    haptics.selection();
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setOverview((o) => !o);
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={habits}
        keyExtractor={(h) => h.id}
        renderItem={({ item }) =>
          overview ? <OverviewCard habit={item} /> : <HabitCard habit={item} />
        }
        ListHeaderComponent={
          <Header overview={overview} onToggle={toggleOverview} habits={habits} />
        }
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        ListEmptyComponent={hydrated ? <EmptyState /> : <SkeletonList />}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      />
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
        <Text style={styles.title}>Your habits</Text>
        <Pressable
          hitSlop={12}
          onPress={onToggle}
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

      {overview && habits.length > 0 && <Summary habits={habits} />}
    </View>
  );
}

function Summary({ habits }: { habits: Habit[] }) {
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
}

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
    <View style={styles.empty}>
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
    </View>
  );
}

const styles = StyleSheet.create((theme, rt) => ({
  container: {
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
    marginBottom: theme.space.xl,
    gap: theme.space.lg,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    fontSize: theme.font.title,
    fontWeight: theme.weight.bold,
    letterSpacing: -0.5,
    color: theme.colors.textPrimary,
  },
  summary: {
    flexDirection: 'row',
    gap: theme.space.xxxl,
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
