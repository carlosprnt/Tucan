import { SymbolView } from 'expo-symbols';
import { forwardRef, useImperativeHandle } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useUnistyles } from 'react-native-unistyles';

export type SparkleBurstHandle = { play: () => void };

// dx/dy = direction it flies out; s = size.
const SPARKS = [
  { dx: -18, dy: -14, s: 11 },
  { dx: 17, dy: -16, s: 8 },
  { dx: -13, dy: 15, s: 7 },
  { dx: 15, dy: 13, s: 9 },
  { dx: 2, dy: -22, s: 6 },
];

/**
 * Tiny sparkles that burst from behind an icon and fade out (opacity 1 -> 0).
 * Call `play()` via ref when a day is marked complete.
 */
export const SparkleBurst = forwardRef<SparkleBurstHandle, { color?: string | null }>(
  function SparkleBurst({ color }, ref) {
    const { theme } = useUnistyles();
    const p = useSharedValue(1); // 1 = finished/hidden
    const tint = color ?? theme.colors.dotDone;

    useImperativeHandle(
      ref,
      () => ({
        play: () => {
          p.value = 0;
          p.value = withTiming(1, { duration: 450, easing: Easing.out(Easing.quad) });
        },
      }),
      [p],
    );

    return (
      <View pointerEvents="none" style={styles.wrap}>
        {SPARKS.map((spec, i) => (
          <Spark key={i} progress={p} spec={spec} tint={tint} />
        ))}
      </View>
    );
  },
);

function Spark({
  progress,
  spec,
  tint,
}: {
  progress: { value: number };
  spec: { dx: number; dy: number; s: number };
  tint: string;
}) {
  const style = useAnimatedStyle(() => ({
    opacity: 1 - progress.value,
    transform: [
      { translateX: progress.value * spec.dx },
      { translateY: progress.value * spec.dy },
      { scale: 0.4 + progress.value * 0.7 },
    ],
  }));

  return (
    <Animated.View style={[styles.spark, style]}>
      <SymbolView name="sparkle" size={spec.s} tintColor={tint} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  spark: {
    position: 'absolute',
  },
});
