import { type ReactNode, useRef } from 'react';
import { ScrollView } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { useUnistyles } from 'react-native-unistyles';

import {
  addDays,
  ALL_DAYS,
  daysBetween,
  fromDateKey,
  isActiveDay,
  type DateKey,
} from '@/lib/date';
import { diamondPath } from '@/lib/glyph';

const CELL = 10;
const GAP = 3;
const DAYS = 364; // ~52 weeks

interface YearHeatmapProps {
  completed: Set<DateKey>;
  startDate: DateKey;
  today: DateKey;
  color?: string | null;
  activeDays?: number;
}

/** Year grid of diamonds (weeks × 7), newest on the right. One <Svg> for perf. */
export function YearHeatmap({
  completed,
  startDate,
  today,
  color,
  activeDays = ALL_DAYS,
}: YearHeatmapProps) {
  const { theme } = useUnistyles();
  const scrollRef = useRef<ScrollView>(null);
  const accent = color ?? theme.colors.dotDone;
  const path = diamondPath(CELL);

  let first = addDays(today, -(DAYS - 1));
  first = addDays(first, -fromDateKey(first).getDay()); // back to Sunday
  const weeks = Math.floor(daysBetween(first, today) / 7) + 1;

  const width = weeks * (CELL + GAP) - GAP;
  const height = 7 * (CELL + GAP) - GAP;

  const cells: ReactNode[] = [];
  for (let w = 0; w < weeks; w++) {
    for (let d = 0; d < 7; d++) {
      const key = addDays(first, w * 7 + d);
      const isFuture = daysBetween(today, key) > 0;
      const beforeStart = daysBetween(startDate, key) < 0;
      if (beforeStart || !isActiveDay(activeDays, key)) continue;
      const isDone = completed.has(key);
      const x = w * (CELL + GAP);
      const y = d * (CELL + GAP);
      if (isFuture) {
        cells.push(
          <Circle
            key={`${w}-${d}`}
            cx={x + CELL / 2}
            cy={y + CELL / 2}
            r={Math.max(1.5, CELL * 0.13)}
            fill={theme.colors.dotFutureBorder}
          />,
        );
        continue;
      }
      cells.push(
        <Path
          key={`${w}-${d}`}
          d={path}
          transform={`translate(${x}, ${y})`}
          fill={isDone ? accent : theme.colors.dotMissed}
        />,
      );
    }
  }

  return (
    <ScrollView
      ref={scrollRef}
      horizontal
      showsHorizontalScrollIndicator={false}
      onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: false })}>
      <Svg width={width} height={height}>
        {cells}
      </Svg>
    </ScrollView>
  );
}
