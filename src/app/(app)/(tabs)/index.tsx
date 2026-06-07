import { observer } from '@legendapp/state/react';
import { useRouter } from 'expo-router';
import { FlatList, Pressable, Text, View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

import { HabitCard } from '@/components/HabitCard';
import { haptics } from '@/lib/haptics';
import { listHabits } from '@/store';

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

  return (
    <View style={styles.container}>
      <FlatList
        data={habits}
        keyExtractor={(h) => h.id}
        renderItem={({ item }) => <HabitCard habit={item} />}
        ListHeaderComponent={<Header />}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        ListEmptyComponent={<EmptyState />}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
});

export default Today;

function Header() {
  const { day, sub } = todayParts();
  return (
    <View style={styles.header}>
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
      <Text style={styles.emptyTitle}>No habits yet</Text>
      <Text style={styles.emptyBody}>
        Start with one small thing you want to do every day.
      </Text>
      <Pressable
        style={({ pressed }) => [styles.emptyButton, pressed && styles.pressed]}
        onPress={() => {
          haptics.light();
          router.push('/habit/new');
        }}>
        <Text style={styles.emptyButtonText}>Create habit</Text>
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
