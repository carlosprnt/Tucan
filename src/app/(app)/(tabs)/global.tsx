import { observer } from '@legendapp/state/react';
import { useRouter } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';

import { YearHeatmap } from '@/components/YearHeatmap';
import { todayKey } from '@/lib/date';
import { habitIcon } from '@/lib/icons';
import { completedDates, listHabits, statsForHabit, totalForHabit } from '@/store';

const Global = observer(function Global() {
  const router = useRouter();
  const { theme } = useUnistyles();
  const today = todayKey();
  const habits = listHabits();

  const totalAll = habits.reduce((sum, h) => sum + totalForHabit(h.id), 0);
  const avgPercent = habits.length
    ? Math.round(
        habits.reduce((sum, h) => sum + statsForHabit(h.id, h.start_date).percent, 0) /
          habits.length,
      )
    : 0;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>Global</Text>
        <Pressable hitSlop={12} onPress={() => router.push('/settings')}>
          <SymbolView name="gearshape" size={24} tintColor={theme.colors.textPrimary} />
        </Pressable>
      </View>

      <View style={styles.summary}>
        <Stat value={String(totalAll)} label="total completed" />
        <Stat value={`${avgPercent}%`} label="average" />
      </View>

      {habits.length === 0 ? (
        <Text style={styles.empty}>Create a habit to see your year.</Text>
      ) : (
        habits.map((h) => (
          <View key={h.id} style={styles.card}>
            <View style={styles.cardHead}>
              <SymbolView name={habitIcon(h.icon)} size={18} tintColor={h.color ?? theme.colors.ink} />
              <Text style={styles.cardName} numberOfLines={1}>
                {h.name}
              </Text>
              <Text style={styles.cardTotal}>{totalForHabit(h.id)}</Text>
            </View>
            <YearHeatmap
              completed={completedDates(h.id)}
              startDate={h.start_date}
              today={today}
              color={h.color}
            />
          </View>
        ))
      )}
    </ScrollView>
  );
});

export default Global;

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
  },
  content: {
    paddingHorizontal: theme.space.lg,
    paddingTop: rt.insets.top + theme.space.lg,
    paddingBottom: rt.insets.bottom + 96,
    gap: theme.space.xl,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    fontSize: theme.font.display,
    fontWeight: theme.weight.bold,
    letterSpacing: -1,
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
    fontSize: theme.font.title,
    fontWeight: theme.weight.bold,
    color: theme.colors.textPrimary,
  },
  statLabel: {
    fontSize: theme.font.caption,
    color: theme.colors.textSecondary,
  },
  card: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.radius.lg,
    padding: theme.space.lg,
    gap: theme.space.md,
  },
  cardHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.space.sm,
  },
  cardName: {
    flex: 1,
    fontSize: theme.font.body,
    fontWeight: theme.weight.semibold,
    color: theme.colors.textPrimary,
  },
  cardTotal: {
    fontSize: theme.font.caption,
    color: theme.colors.textSecondary,
  },
  empty: {
    fontSize: theme.font.body,
    color: theme.colors.textSecondary,
  },
}));
