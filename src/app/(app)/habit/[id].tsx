import '@/theme/unistyles';

import { observer, use$ } from '@legendapp/state/react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';

import { Glyph } from '@/components/Glyph';
import { MonthCalendar } from '@/components/MonthCalendar';
import { cascadeIn } from '@/lib/anim';
import { fromDateKey, todayKey } from '@/lib/date';
import { haptics } from '@/lib/haptics';
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

  const now = new Date();
  const mode = use$(detailUI$.mode);
  const [cursor, setCursor] = useState({ year: now.getFullYear(), month: now.getMonth() });

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
  const stats = statsForHabit(habit.id, habit.start_date);
  const accent = habit.color ?? theme.colors.ink;

  function shiftMonth(delta: number) {
    haptics.selection();
    setCursor((c) => {
      const d = new Date(c.year, c.month + delta, 1);
      return { year: d.getFullYear(), month: d.getMonth() };
    });
  }

  return (
    <View style={styles.screen}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}>
        <Header
          title={habit.name}
          onBack={() => router.back()}
          onEdit={() => router.push({ pathname: '/habit/new', params: { id: habit.id } })}
        />

        <View style={styles.stats}>
          <Stat value={String(stats.total)} label="completed" />
          <Stat value={`${stats.percent}%`} label="since start" />
        </View>

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
    </View>
  );
});

export default HabitDetail;

const CELL = 12;
const GAP = 6;

function Accumulation({
  total,
  percent,
  accent,
}: {
  total: number;
  percent: number;
  accent: string;
}) {
  return (
    <View style={styles.section}>
      {total === 0 ? (
        <Text style={styles.missing}>No dots yet — mark today done to start.</Text>
      ) : (
        <View style={[styles.accGrid, { gap: GAP }]}>
          {Array.from({ length: total }, (_, i) => (
            <Animated.View key={i} entering={cascadeIn(i)} style={{ width: CELL, height: CELL }}>
              <Glyph size={CELL} state="done" color={accent} />
            </Animated.View>
          ))}
        </View>
      )}
      <Text style={styles.accFooter}>{percent}% of days since you started</Text>
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
          <SymbolView name="pencil" size={20} tintColor={theme.colors.textPrimary} />
        </Pressable>
      ) : (
        <View style={styles.iconBtn} />
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

function monthLabel(year: number, month: number): string {
  return fromDateKey(`${year}-${String(month + 1).padStart(2, '0')}-01`).toLocaleDateString(
    undefined,
    { month: 'long', year: 'numeric' },
  );
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
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: {
    flex: 1,
    textAlign: 'left',
    marginLeft: theme.space.xl,
    fontSize: theme.font.heading,
    fontWeight: theme.weight.bold,
    color: theme.colors.textPrimary,
  },
  iconBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
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
  accGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
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
