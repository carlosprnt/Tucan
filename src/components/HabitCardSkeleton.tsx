import { useEffect } from 'react';
import { View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { StyleSheet } from 'react-native-unistyles';

import { DottedSeparator } from './DottedSeparator';

/*
 * Reanimated shared-value writes happen only inside an effect (never during
 * render), so the React Compiler immutability rule doesn't apply here.
 */
/* eslint-disable react-hooks/immutability */

// Matches HabitCard's dot grid: 3 rows of 11px cells with 5px gaps. We reserve
// this height (without drawing the grid) so the skeleton card is exactly as
// tall as a real card — no jump when the content swaps in.
const GRID_HEIGHT = 11 * 3 + 5 * 2;

/**
 * A loading placeholder for a {@link HabitCard}: icon tile, name + total lines,
 * today toggle and the dotted separator. The dot grid isn't drawn, but its
 * height is reserved so the card matches a real one. It breathes with a soft
 * opacity pulse; `delay` staggers a row of them into a gentle cascade.
 */
export function HabitCardSkeleton({ delay = 0 }: { delay?: number }) {
  const pulse = useSharedValue(0.5);
  useEffect(() => {
    pulse.value = withDelay(
      delay,
      withRepeat(withTiming(1, { duration: 850, easing: Easing.inOut(Easing.ease) }), -1, true),
    );
  }, [pulse, delay]);
  const pulseStyle = useAnimatedStyle(() => ({ opacity: pulse.value }));

  return (
    <Animated.View style={[styles.card, pulseStyle]}>
      <View style={styles.top}>
        <View style={styles.icon} />
        <View style={styles.info}>
          <View style={styles.name} />
          <View style={styles.total} />
        </View>
        <View style={styles.toggle} />
      </View>

      <DottedSeparator />

      {/* Reserves the dot grid's height (nothing drawn) to match a real card. */}
      <View style={styles.gridSpacer} />
    </Animated.View>
  );
}

/**
 * Loading placeholder for the header's today-progress chip — a pill that pulses
 * in sync with the card skeletons.
 */
export function ChipSkeleton() {
  const pulse = useSharedValue(0.5);
  useEffect(() => {
    pulse.value = withRepeat(
      withTiming(1, { duration: 850, easing: Easing.inOut(Easing.ease) }),
      -1,
      true,
    );
  }, [pulse]);
  const pulseStyle = useAnimatedStyle(() => ({ opacity: pulse.value }));
  return <Animated.View style={[styles.chip, pulseStyle]} />;
}

const styles = StyleSheet.create((theme) => ({
  card: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.radius.xl,
    padding: theme.space.xl,
    gap: theme.space.lg,
  },
  top: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.space.md,
  },
  icon: {
    width: 44,
    height: 44,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.dotMissed,
  },
  info: {
    flex: 1,
    gap: theme.space.sm,
  },
  name: {
    height: 16,
    width: '55%',
    borderRadius: theme.radius.sm,
    backgroundColor: theme.colors.dotMissed,
  },
  total: {
    height: 12,
    width: '28%',
    borderRadius: theme.radius.sm,
    backgroundColor: theme.colors.dotMissed,
  },
  toggle: {
    width: 34,
    height: 34,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.dotMissed,
  },
  gridSpacer: {
    height: GRID_HEIGHT,
  },
  chip: {
    width: 76,
    height: 38,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.dotMissed,
  },
}));
