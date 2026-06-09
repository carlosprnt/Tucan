import Svg, { Circle, Path } from 'react-native-svg';
import { useUnistyles } from 'react-native-unistyles';

import { diamondPath } from '@/lib/glyph';
import type { DotState } from '@/lib/grid';

interface DotGridProps {
  states: DotState[];
  columns: number;
  cellSize?: number;
  gap?: number;
  /** Premium habit color for "done" cells; defaults to monochrome ink. */
  color?: string | null;
}

/**
 * The hero element: a grid of diamond glyphs drawn in a single <Svg> (one native
 * view) for performance. Callers build the `states` array (see lib/grid).
 */
export function DotGrid({ states, columns, cellSize = 12, gap = 6, color }: DotGridProps) {
  const { theme } = useUnistyles();

  const rows = Math.max(1, Math.ceil(states.length / columns));
  const width = columns * cellSize + (columns - 1) * gap;
  const height = rows * cellSize + (rows - 1) * gap;
  const path = diamondPath(cellSize);

  return (
    <Svg width={width} height={height}>
      {states.map((state, i) => {
        if (state === 'empty') return null;
        const col = i % columns;
        const row = Math.floor(i / columns);
        const x = col * (cellSize + gap);
        const y = row * (cellSize + gap);
        if (state === 'future') {
          return (
            <Circle
              key={i}
              cx={x + cellSize / 2}
              cy={y + cellSize / 2}
              r={Math.max(1.5, cellSize * 0.13)}
              fill={theme.colors.dotFutureBorder}
            />
          );
        }
        // Today, still unmarked: outline only (stroke, no fill).
        if (state === 'today') {
          return (
            <Path
              key={i}
              d={path}
              transform={`translate(${x}, ${y})`}
              fill="none"
              stroke={color ?? theme.colors.ink}
              strokeWidth={Math.max(1.5, cellSize * 0.1)}
            />
          );
        }
        const fill = state === 'done' ? (color ?? theme.colors.dotDone) : theme.colors.dotMissed;
        return <Path key={i} d={path} transform={`translate(${x}, ${y})`} fill={fill} />;
      })}
    </Svg>
  );
}
