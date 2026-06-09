import { useEffect } from 'react';
import { Dimensions, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  Extrapolation,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';

/* eslint-disable react-hooks/immutability */

const H = Dimensions.get('window').height;
const DISMISS_DISTANCE = H * 0.22;

/**
 * A modal sheet you drag down to dismiss. As you drag (from the handle), the
 * sheet scales toward 0.93 (reaching it ~halfway down the screen) and the
 * backdrop fades; releasing past a threshold dismisses, otherwise it springs
 * back. Present the screen as `transparentModal` so the sheet owns the motion.
 */
export function DragSheet({ onClose, children }: { onClose: () => void; children: React.ReactNode }) {
  const { theme, rt } = useUnistyles();
  const y = useSharedValue(H);

  useEffect(() => {
    y.value = withSpring(0, { damping: 24, stiffness: 240, mass: 0.9 });
  }, [y]);

  const dismiss = () => onClose();

  // Drag from the top grabber zone; taps pass through (activeOffsetY).
  const pan = Gesture.Pan()
    .activeOffsetY(8)
    .onUpdate((e) => {
      y.value = Math.max(0, e.translationY);
    })
    .onEnd((e) => {
      if (y.value > DISMISS_DISTANCE || e.velocityY > 900) {
        y.value = withTiming(H, { duration: 220 }, (finished) => {
          if (finished) runOnJS(dismiss)();
        });
      } else {
        y.value = withSpring(0, { damping: 24, stiffness: 240 });
      }
    });

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: y.value },
      { scale: interpolate(y.value, [0, H * 0.5], [1, 0.93], Extrapolation.CLAMP) },
    ],
  }));
  const backdropStyle = useAnimatedStyle(() => ({
    opacity: interpolate(y.value, [0, H], [0.45, 0], Extrapolation.CLAMP),
  }));

  return (
    <View style={styles.fill}>
      <Animated.View pointerEvents="none" style={[styles.backdrop, backdropStyle]} />
      <Animated.View
        style={[
          styles.sheet,
          { backgroundColor: theme.colors.canvas, marginTop: rt.insets.top + 8 },
          sheetStyle,
        ]}>
        <GestureDetector gesture={pan}>
          <View style={styles.grabZone}>
            <View style={styles.grabber} />
          </View>
        </GestureDetector>
        {children}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  fill: {
    flex: 1,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000',
  },
  sheet: {
    flex: 1,
    borderTopLeftRadius: theme.radius.xl,
    borderTopRightRadius: theme.radius.xl,
    overflow: 'hidden',
  },
  grabZone: {
    alignItems: 'center',
    paddingTop: theme.space.sm,
    paddingBottom: theme.space.md,
  },
  grabber: {
    width: 36,
    height: 5,
    borderRadius: 999,
    backgroundColor: theme.colors.separator,
  },
}));
