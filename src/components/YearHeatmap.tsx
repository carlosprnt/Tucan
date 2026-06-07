import { useRef } from 'react';
import { ScrollView, View } from 'react-native';
import { useUnistyles } from 'react-native-unistyles';

import { addDays, daysBetween, fromDateKey, type DateKey } from '@/lib/date';

const DOT = 11;
const GAP = 3;
const DAYS = 364; // ~52 weeks

interface YearHeatmapProps {
  completed: Set<DateKey>;
  startDate: DateKey;
  today: DateKey;
  color?: string | null;
}

/** GitHub-style year grid: columns are weeks (Sun..Sat), newest on the right. */
export function YearHeatmap({ completed, startDate, today, color }: YearHeatmapProps) {
  const { theme } = useUnistyles();
  const scrollRef = useRef<ScrollView>(null);
  const accent = color ?? theme.colors.dotDone;

  // First cell aligned back to a Sunday.
  let first = addDays(today, -(DAYS - 1));
  first = addDays(first, -fromDateKey(first).getDay());
  const weeks = Math.floor(daysBetween(first, today) / 7) + 1;

  return (
    <ScrollView
      ref={scrollRef}
      horizontal
      showsHorizontalScrollIndicator={false}
      onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: false })}>
      <View style={{ flexDirection: 'row', gap: GAP }}>
        {Array.from({ length: weeks }, (_, w) => (
          <View key={w} style={{ gap: GAP }}>
            {Array.from({ length: 7 }, (_, d) => {
              const key = addDays(first, w * 7 + d);
              const isFuture = daysBetween(today, key) > 0;
              const beforeStart = daysBetween(startDate, key) < 0;
              const isDone = completed.has(key);
              return (
                <View
                  key={d}
                  style={[
                    { width: DOT, height: DOT, borderRadius: DOT / 2 },
                    beforeStart && { backgroundColor: 'transparent' },
                    !beforeStart && isDone && { backgroundColor: accent },
                    !beforeStart && !isDone && !isFuture && {
                      backgroundColor: theme.colors.dotMissed,
                    },
                    !beforeStart && isFuture && {
                      backgroundColor: theme.colors.dotFutureBg,
                      borderWidth: 1,
                      borderColor: theme.colors.dotFutureBorder,
                    },
                  ]}
                />
              );
            })}
          </View>
        ))}
      </View>
    </ScrollView>
  );
}
