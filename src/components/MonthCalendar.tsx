import { useState } from 'react';
import { type LayoutChangeEvent, Pressable, Text, View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

import { daysBetween, type DateKey } from '@/lib/date';
import type { DotState } from '@/lib/grid';
import { haptics } from '@/lib/haptics';

import { Glyph } from './Glyph';

const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const GAP = 8;

interface MonthCalendarProps {
  year: number;
  month: number; // 0-11
  completed: Set<DateKey>;
  startDate: DateKey;
  today: DateKey;
  color?: string | null;
  onToggleDay: (key: DateKey) => void;
}

/** Weekday-aligned month grid of diamonds. Past/today cells (>= start) tap to toggle. */
export function MonthCalendar({
  year,
  month,
  completed,
  startDate,
  today,
  color,
  onToggleDay,
}: MonthCalendarProps) {
  const [width, setWidth] = useState(0);

  const cellSize = width > 0 ? (width - GAP * 6) / 7 : 0;
  const glyphSize = cellSize * 0.76;

  const firstDow = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells: ({ day: number; key: DateKey } | null)[] = [];
  for (let i = 0; i < firstDow; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) {
    const key = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    cells.push({ day: d, key });
  }

  return (
    <View onLayout={(e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width)}>
      <View style={[styles.row, { gap: GAP, marginBottom: GAP }]}>
        {WEEKDAYS.map((w, i) => (
          <View key={i} style={{ width: cellSize, alignItems: 'center' }}>
            <Text style={styles.weekday}>{w}</Text>
          </View>
        ))}
      </View>

      {width > 0 && (
        <View style={[styles.grid, { gap: GAP }]}>
          {cells.map((cell, i) => {
            if (!cell) return <View key={i} style={{ width: cellSize, height: cellSize }} />;

            const isFuture = daysBetween(today, cell.key) > 0;
            const beforeStart = daysBetween(startDate, cell.key) < 0;
            const isDone = completed.has(cell.key);
            const tappable = !isFuture && !beforeStart;

            const state: DotState = beforeStart
              ? 'empty'
              : isFuture
                ? 'future'
                : isDone
                  ? 'done'
                  : 'missed';

            return (
              <Pressable
                key={i}
                disabled={!tappable}
                accessibilityRole="button"
                accessibilityLabel={cell.key}
                accessibilityState={{ checked: isDone, disabled: !tappable }}
                onPress={() => {
                  haptics.light();
                  onToggleDay(cell.key);
                }}
                style={{ width: cellSize, height: cellSize, alignItems: 'center', justifyContent: 'center' }}>
                <Glyph size={glyphSize} state={state} color={color} />
              </Pressable>
            );
          })}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  row: {
    flexDirection: 'row',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  weekday: {
    fontSize: theme.font.caption,
    color: theme.colors.textMuted,
  },
}));
