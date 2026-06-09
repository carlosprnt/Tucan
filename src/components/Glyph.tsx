import { useEffect } from 'react';
import { View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
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

  // Today, still unmarked: outline only (stroke, no fill), gently pulsing.
  if (state === 'today') {
    return <TodayGlyph size={size} color={color ?? theme.colors.ink} />;
  }

  const fill = state === 'done' ? (color ?? theme.colors.dotDone) : theme.colors.dotMissed;

  return (
    <Svg width={size} height={size}>
      <Path d={diamondPath(size)} fill={fill} />
    </Svg>
  );
}

/** Today's unmarked outline diamond, with a slow, subtle opacity pulse. */
function TodayGlyph({ size, color }: { size: number; color: string }) {
  const opacity = useSharedValue(1);
  useEffect(() => {
    opacity.value = withRepeat(
      withSequence(
        withTiming(0.4, { duration: 1200 }),
        withTiming(1, { duration: 1200 }),
      ),
      -1,
      false,
    );
  }, [opacity]);
  const style = useAnimatedStyle(() => ({ opacity: opacity.value }));
  const sw = Math.max(1.5, size * 0.1);

  return (
    <Animated.View style={style}>
      <Svg width={size} height={size}>
        <Path d={diamondPath(size)} fill="none" stroke={color} strokeWidth={sw} />
      </Svg>
    </Animated.View>
  );
}
