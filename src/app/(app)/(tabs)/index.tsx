import '@/theme/unistyles';

import { observer } from '@legendapp/state/react';
import { useRouter } from 'expo-router';
import { FlatList, Pressable, Text, View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

import { HabitCard } from '@/components/HabitCard';
import { haptics } from '@/lib/haptics';
import { isStoreHydrated, listHabits } from '@/store';

function todayParts() {
  const d = new Date();
  return {
    day: d.getDate(),
    sub: d.toLocaleDateString(undefined, {
      weekday: 'long',
      month: 'long',
      year: 'numeric',
    }),
  };
}

const Today = observer(function Today() {
  const habits = listHabits();
  const hydrated = isStoreHydrated();

  return (
    <View style={styles.container}>
      <FlatList
        data={habits}
        keyExtractor={(h) => h.id}
        renderItem={({ item }) => <HabitCard habit={item} />}
        ListHeaderComponent={<Header />}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        ListEmptyComponent={hydrated ? <EmptyState /> : <SkeletonList />}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
});

function SkeletonList() {
  return (
    <View style={styles.skeletonList}>
      {[0, 1, 2].map((i) => (
        <View key={i} style={styles.skeletonCard} />
      ))}
    </View>
  );
}

export default Today;

function Header() {
  const { day, sub } = todayParts();
  return (
    <View style={styles.header}>
      <Text style={styles.kicker}>TODAY</Text>
      <View style={styles.dateRow}>
        <Text style={styles.dayNum}>{day}</Text>
        <View style={styles.accentDot} />
      </View>
      <Text style={styles.date}>{sub}</Text>
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
    // Clear the floating tab bar.
    paddingBottom: rt.insets.bottom + 96,
    flexGrow: 1,
  },
  header: {
    marginBottom: theme.space.xl,
    gap: theme.space.xs,
  },
  kicker: {
    fontSize: theme.font.caption,
    fontWeight: theme.weight.medium,
    letterSpacing: 1,
    color: theme.colors.textMuted,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: theme.space.sm,
  },
  dayNum: {
    fontSize: theme.font.mega,
    fontWeight: theme.weight.heavy,
    letterSpacing: -2,
    lineHeight: theme.font.mega,
    color: theme.colors.textPrimary,
  },
  accentDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginTop: theme.space.md,
    backgroundColor: theme.colors.accent,
  },
  date: {
    fontSize: theme.font.body,
    fontWeight: theme.weight.medium,
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
