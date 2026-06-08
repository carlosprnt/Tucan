import { useRef, useState } from 'react';
import { type LayoutChangeEvent, Pressable, Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { StyleSheet } from 'react-native-unistyles';

import { cascadeIn } from '@/lib/anim';
import { daysBetween, type DateKey } from '@/lib/date';
import type { DotState } from '@/lib/grid';
import { haptics } from '@/lib/haptics';

import { Glyph } from './Glyph';
import { SparkleBurst, type SparkleBurstHandle } from './SparkleBurst';

/* eslint-disable react-hooks/immutability */

const WEEKDAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
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

/** Weekday-aligned month grid of diamonds. Cells cascade in; tapping a day
 *  bounces the glyph and bursts sparkles when it becomes complete. */
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
  const sparkleRef = useRef<SparkleBurstHandle>(null);
  // Position via shared values so it's set synchronously before play() (avoids
  // the sparkle appearing on the previously tapped cell).
  const px = useSharedValue(0);
  const py = useSharedValue(0);
  const overlayStyle = useAnimatedStyle(() => ({ left: px.value, top: py.value }));

  const cellSize = width > 0 ? (width - GAP * 6) / 7 : 0;
  const glyphSize = cellSize * 0.62;

  // Monday-first: shift JS getDay() (0=Sun) so Monday = 0.
  const firstDow = (new Date(year, month, 1).getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells: ({ day: number; key: DateKey } | null)[] = [];
  for (let i = 0; i < firstDow; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) {
    const key = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    cells.push({ day: d, key });
  }

  function handleDay(slot: number, key: DateKey, isDone: boolean) {
    haptics.light();
    if (!isDone) {
      // becoming complete -> sparkle from the cell center
      const col = slot % 7;
      const row = Math.floor(slot / 7);
      px.value = col * (cellSize + GAP) + cellSize / 2;
      py.value = row * (cellSize + GAP) + cellSize / 2;
      sparkleRef.current?.play();
    }
    onToggleDay(key);
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
              <DayCell
                key={i}
                slot={i}
                cellSize={cellSize}
                glyphSize={glyphSize}
                state={state}
                color={color}
                tappable={tappable}
                label={cell.key}
                isDone={isDone}
                onPress={() => handleDay(i, cell.key, isDone)}
              />
            );
          })}

          <Animated.View
            pointerEvents="none"
            style={[{ position: 'absolute', width: 0, height: 0 }, overlayStyle]}>
            <SparkleBurst ref={sparkleRef} color={color} />
          </Animated.View>
        </View>
      )}
    </View>
  );
}

function DayCell({
  slot,
  cellSize,
  glyphSize,
  state,
  color,
  tappable,
  label,
  isDone,
  onPress,
}: {
  slot: number;
  cellSize: number;
  glyphSize: number;
  state: DotState;
  color?: string | null;
  tappable: boolean;
  label: string;
  isDone: boolean;
  onPress: () => void;
}) {
  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <Animated.View entering={cascadeIn(slot)} style={{ width: cellSize, height: cellSize }}>
      <Pressable
        disabled={!tappable}
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityState={{ checked: isDone, disabled: !tappable }}
        onPress={() => {
          if (tappable) {
            scale.value = withSequence(
              withTiming(1.12, { duration: 70 }),
              withSpring(1, { damping: 18, stiffness: 300 }),
            );
          }
          onPress();
        }}
        style={styles.cell}>
        <Animated.View style={animStyle}>
          <Glyph size={glyphSize} state={state} color={color} />
        </Animated.View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create((theme) => ({
  row: {
    flexDirection: 'row',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    position: 'relative',
  },
  cell: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  weekday: {
    fontSize: theme.font.caption,
    color: theme.colors.textMuted,
  },
}));
