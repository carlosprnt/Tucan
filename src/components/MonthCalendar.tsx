import { useState } from 'react';
import { type LayoutChangeEvent, Pressable, Text, View } from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';

import { daysBetween, type DateKey } from '@/lib/date';

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

/** Weekday-aligned month grid. Past/today cells (>= start) are tappable. */
export function MonthCalendar({
  year,
  month,
  completed,
  startDate,
  today,
  color,
  onToggleDay,
}: MonthCalendarProps) {
  const { theme } = useUnistyles();
  const [width, setWidth] = useState(0);

  const cellSize = width > 0 ? (width - GAP * 6) / 7 : 0;
  const dotSize = cellSize * 0.72;
  const accent = color ?? theme.colors.dotDone;

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

            return (
              <Pressable
                key={i}
                disabled={!tappable}
                onPress={() => onToggleDay(cell.key)}
                style={{ width: cellSize, height: cellSize, alignItems: 'center', justifyContent: 'center' }}>
                <View
                  style={[
                    { width: dotSize, height: dotSize, borderRadius: dotSize / 2 },
                    beforeStart && { backgroundColor: 'transparent' },
                    !beforeStart && isDone && { backgroundColor: accent },
                    !beforeStart && !isDone && !isFuture && { backgroundColor: theme.colors.dotMissed },
                    !beforeStart && isFuture && {
                      backgroundColor: theme.colors.dotFutureBg,
                      borderWidth: 1,
                      borderColor: theme.colors.dotFutureBorder,
                    },
                  ]}
                />
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
