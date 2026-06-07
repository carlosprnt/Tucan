import { SymbolView } from 'expo-symbols';
import { useEffect, useRef } from 'react';
import { Pressable, View } from 'react-native';
import Animated, {
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';

import { haptics } from '@/lib/haptics';
import { SparkleBurst, type SparkleBurstHandle } from './SparkleBurst';

/*
 * Reanimated shared-value writes (`sv.value = ...`) are the library's official
 * API but trip the React Compiler's react-hooks/immutability rule. These writes
 * only happen in event handlers / effects, never during render, so it's safe to
 * disable that rule for this animation primitive.
 */
/* eslint-disable react-hooks/immutability */

interface TodayToggleProps {
  done: boolean;
  onPress: () => void;
  /** Optional premium habit color; falls back to monochrome ink. */
  color?: string | null;
}

/** Circular mark-today control: spring fill + haptic when toggled. */
export function TodayToggle({ done, onPress, color }: TodayToggleProps) {
  const { theme } = useUnistyles();
  const fill = color ?? theme.colors.dotDone;
  const border = theme.colors.dotMissed;

  const progress = useSharedValue(done ? 1 : 0);
  const scale = useSharedValue(1);
  const sparkleRef = useRef<SparkleBurstHandle>(null);

  useEffect(() => {
    progress.value = withSpring(done ? 1 : 0, { damping: 19, stiffness: 280 });
  }, [done, progress]);

  const containerStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    backgroundColor: interpolateColor(progress.value, [0, 1], ['rgba(0,0,0,0)', fill]),
    borderColor: interpolateColor(progress.value, [0, 1], [border, fill]),
  }));

  const checkStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [{ scale: progress.value }],
  }));

  function handlePress() {
    if (done) {
      haptics.light();
    } else {
      haptics.medium();
      sparkleRef.current?.play(); // celebrate only when marking done
    }
    scale.value = withSequence(
      withTiming(1.1, { duration: 70 }),
      withSpring(1, { damping: 18, stiffness: 300 }),
    );
    onPress();
  }

  return (
    <Pressable
      hitSlop={12}
      onPress={handlePress}
      onPressIn={() => {
        scale.value = withTiming(0.9, { duration: 70 });
      }}
      onPressOut={() => {
        scale.value = withSpring(1, { damping: 18, stiffness: 300 });
      }}
      accessibilityRole="button"
      accessibilityState={{ checked: done }}
      accessibilityLabel={done ? 'Mark as not done today' : 'Mark as done today'}>
      <View style={styles.host}>
        <SparkleBurst ref={sparkleRef} color={color} />
        <Animated.View style={[styles.base, containerStyle]}>
          <Animated.View style={checkStyle}>
            <SymbolView name="checkmark" size={18} weight="bold" tintColor={theme.colors.canvas} />
          </Animated.View>
        </Animated.View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create(() => ({
  host: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  base: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
}));
