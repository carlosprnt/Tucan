import { View } from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';

import type { DotState } from '@/lib/grid';

interface DotGridProps {
  states: DotState[];
  columns: number;
  dotSize?: number;
  gap?: number;
}

/**
 * The hero element: a wrapping grid of dots. Pure renderer — callers build the
 * `states` array (see lib/grid). Glyph is a circle (per spec default).
 */
export function DotGrid({ states, columns, dotSize = 10, gap = 5 }: DotGridProps) {
  const { theme } = useUnistyles();

  const width = columns * dotSize + (columns - 1) * gap;

  return (
    <View style={[styles.grid, { width, gap }]}>
      {states.map((state, i) => (
        <View
          key={i}
          style={[
            { width: dotSize, height: dotSize, borderRadius: dotSize / 2 },
            state === 'done' && { backgroundColor: theme.colors.dotDone },
            state === 'missed' && { backgroundColor: theme.colors.dotMissed },
            state === 'future' && {
              backgroundColor: theme.colors.dotFutureBg,
              borderWidth: 1,
              borderColor: theme.colors.dotFutureBorder,
            },
            state === 'empty' && { backgroundColor: 'transparent' },
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create(() => ({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
}));
