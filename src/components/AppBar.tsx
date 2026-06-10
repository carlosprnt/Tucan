import { use$ } from '@legendapp/state/react';
import { usePathname, useRouter } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useEffect, useRef, type ReactNode } from 'react';
import { Pressable } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';

import { haptics } from '@/lib/haptics';
import { homeUI$ } from '@/store';

/*
 * Reanimated shared-value writes (`sv.value = ...`) are the library's official
 * API but trip the React Compiler's react-hooks/immutability rule. These writes
 * only happen in press handlers, never during render, so disabling is safe.
 */
/* eslint-disable react-hooks/immutability */

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

/**
 * The persistent home navigation bar: Settings · + · view-change. It stays
 * mounted behind modals (create, settings, habit detail) so the bottom nav is
 * present as they're dismissed.
 */
export function AppBar() {
  const pathname = usePathname();
  const router = useRouter();
  const { theme, rt } = useUnistyles();

  const isHome = pathname === '/';

  // Entrance: rise from below + fade in, fast then decelerating (ease-out).
  // Plays once, the first time home appears AND the dashboard skeleton has
  // cleared (`booted`) — so on a cold/login load the bar stays hidden behind the
  // skeleton and only rises in once content is ready. It must NOT replay when a
  // modal closes — the bar was there behind it all along. Reading the single
  // `booted` boolean (not the habit list) keeps the bar from re-rendering on
  // habit/sync changes, which is what made the icons flicker.
  const booted = use$(homeUI$.booted);
  const enter = useSharedValue(0);
  const entered = useRef(false);
  useEffect(() => {
    if (!isHome || !booted || entered.current) return;
    entered.current = true;
    enter.value = withDelay(
      120,
      withTiming(1, { duration: 600, easing: Easing.out(Easing.cubic) }),
    );
  }, [isHome, booted, enter]);
  const enterStyle = useAnimatedStyle(() => ({
    opacity: enter.value,
    transform: [{ translateY: (1 - enter.value) * 40 }],
  }));

  // Three buttons spread across the bottom —
  // left Settings (opens the modal) · center Create · right view-change.
  const overview = use$(homeUI$.overview);

  return (
    <Animated.View
      pointerEvents="box-none"
      style={[
        styles.wrap,
        styles.spread,
        { paddingBottom: rt.insets.bottom + theme.space.sm },
        // Frame-0 hidden state matching enter=0, so the bar never flashes at its
        // final position for a frame before the animated entrance style commits
        // (very visible in dark mode against the near-black canvas). `enterStyle`
        // overrides this on every committed frame.
        styles.hiddenInit,
        enterStyle,
      ]}>
      <RoundButton
        onPress={() => {
          haptics.selection();
          router.push('/settings');
        }}
        label="Settings">
        <SymbolView name="gearshape.fill" size={24} tintColor={theme.colors.textSecondary} />
      </RoundButton>

      <Fab
        onPress={() => {
          haptics.light();
          router.push('/habit/new');
        }}
        color={theme.colors.ink}
        tint={theme.colors.canvas}
      />

      <RoundButton
        onPress={() => {
          haptics.selection();
          homeUI$.overview.set((o) => !o);
        }}
        label={overview ? 'Show list' : 'Show overview'}
        selected={overview}>
        <SymbolView
          name={overview ? 'square.grid.2x2.fill' : 'chart.bar.fill'}
          size={24}
          tintColor={overview ? theme.colors.ink : theme.colors.textSecondary}
        />
      </RoundButton>
    </Animated.View>
  );
}

function RoundButton({
  onPress,
  label,
  selected,
  children,
}: {
  onPress: () => void;
  label: string;
  selected?: boolean;
  children: ReactNode;
}) {
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={() => {
        scale.value = withTiming(1.3, { duration: 120 });
      }}
      onPressOut={() => {
        scale.value = withTiming(1, { duration: 120 });
      }}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected }}
      style={[styles.roundButton, animatedStyle]}>
      {children}
    </AnimatedPressable>
  );
}


function Fab({
  onPress,
  color,
  tint,
}: {
  onPress: () => void;
  color: string;
  tint: string;
}) {
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return (
    <AnimatedPressable
      accessibilityRole="button"
      accessibilityLabel="Create habit"
      onPressIn={() => {
        scale.value = withTiming(1.3, { duration: 120 });
      }}
      onPressOut={() => {
        scale.value = withTiming(1, { duration: 120 });
      }}
      style={[styles.fab, { backgroundColor: color }, animatedStyle]}
      onPress={onPress}>
      <SymbolView name="plus" size={26} weight="bold" tintColor={tint} />
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create((theme, rt) => ({
  wrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
  },
  hiddenInit: {
    opacity: 0,
    transform: [{ translateY: 40 }],
  },
  spread: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.space.xl,
  },
  roundButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.card,
    // The shadow is invisible on the dark canvas, so add a subtle border there.
    borderWidth: rt.themeName === 'dark' ? 1 : 0,
    borderColor: theme.colors.separator,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  fab: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  pressed: {
    opacity: 0.6,
  },
}));
