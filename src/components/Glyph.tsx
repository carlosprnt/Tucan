import { View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { useUnistyles } from 'react-native-unistyles';

import { diamondPath } from '@/lib/glyph';
import type { DotState } from '@/lib/grid';

interface GlyphProps {
  size: number;
  state: DotState;
  /** Premium habit color for the "done" state; defaults to monochrome ink. */
  color?: string | null;
}

/** A single grid cell. Done/missed are diamonds; future is a small dot. */
export function Glyph({ size, state, color }: GlyphProps) {
  const { theme } = useUnistyles();

  if (state === 'empty') return <View style={{ width: size, height: size }} />;

  if (state === 'future') {
    return (
      <Svg width={size} height={size}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={Math.max(1.5, size * 0.13)}
          fill={theme.colors.dotFutureBorder}
        />
      </Svg>
    );
  }

  // Today, still unmarked: outline only (stroke, no fill).
  if (state === 'today') {
    const stroke = color ?? theme.colors.ink;
    const sw = Math.max(1.5, size * 0.1);
    return (
      <Svg width={size} height={size}>
        <Path d={diamondPath(size)} fill="none" stroke={stroke} strokeWidth={sw} />
      </Svg>
    );
  }

  const fill = state === 'done' ? (color ?? theme.colors.dotDone) : theme.colors.dotMissed;

  return (
    <Svg width={size} height={size}>
      <Path d={diamondPath(size)} fill={fill} />
    </Svg>
  );
}
