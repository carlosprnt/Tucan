import { View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { useUnistyles } from 'react-native-unistyles';

import { diamondPath } from '@/lib/glyph';
import type { DotState } from '@/lib/grid';

interface GlyphProps {
  size: number;
  state: DotState;
  /** Premium habit color for the "done" state; defaults to monochrome ink. */
  color?: string | null;
}

/** A single diamond glyph (used for tappable cells like the month calendar). */
export function Glyph({ size, state, color }: GlyphProps) {
  const { theme } = useUnistyles();

  if (state === 'empty') return <View style={{ width: size, height: size }} />;

  const fill =
    state === 'done'
      ? (color ?? theme.colors.dotDone)
      : state === 'missed'
        ? theme.colors.dotMissed
        : 'none';

  return (
    <Svg width={size} height={size}>
      <Path
        d={diamondPath(size)}
        fill={fill}
        stroke={state === 'future' ? theme.colors.dotFutureBorder : undefined}
        strokeWidth={state === 'future' ? 1 : 0}
      />
    </Svg>
  );
}
