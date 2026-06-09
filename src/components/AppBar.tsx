import { observer } from '@legendapp/state/react';
import { usePathname, useRouter } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useEffect, type ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';

import { TodayToggle } from '@/components/TodayToggle';
import { todayKey } from '@/lib/date';
import { haptics } from '@/lib/haptics';
import { completedDates, detailUI$, getHabit, homeUI$, toggleCompletion } from '@/store';

/*
 * Reanimated shared-value writes (`sv.value = ...`) are the library's official
 * API but trip the React Compiler's react-hooks/immutability rule. These writes
 * only happen in press handlers, never during render, so disabling is safe.
 */
/* eslint-disable react-hooks/immutability */

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

/**
 * Single persistent floating bar. It stays mounted across navigation and shows
 * context-specific actions — main tabs (Settings · + · view) or, inside a
 * habit, two pills (mark today · view selector).
 */
export const AppBar = observer(function AppBar() {
  const pathname = usePathname();
  const router = useRouter();
  const { theme, rt } = useUnistyles();

  const isHome = pathname === '/';

  // Entrance: rise from below + fade in, fast then decelerating (ease-out).
  // Replays every time the home screen becomes active (not just first mount,
  // which can happen behind the splash and be missed).
  const enter = useSharedValue(0);
  useEffect(() => {
    if (!isHome) return;
    enter.value = 0;
    enter.value = withDelay(
      120,
      withTiming(1, { duration: 600, easing: Easing.out(Easing.cubic) }),
    );
  }, [isHome, enter]);
  const enterStyle = useAnimatedStyle(() => ({
    opacity: enter.value,
    transform: [{ translateY: (1 - enter.value) * 40 }],
  }));

  // Over the create/edit sheet, keep the main bar mounted behind it so the
  // bottom nav stays visible as the sheet is swiped away (no flash/disappear).
  const isCreate = pathname === '/habit/new';
  const isDetail = pathname.startsWith('/habit/') && !isCreate;

  if (isDetail) {
    const habitId = detailUI$.habitId.get();
    const mode = detailUI$.mode.get();
    const today = todayKey();
    const habit = habitId ? getHabit(habitId) : undefined;
    const done = habitId ? completedDates(habitId).has(today) : false;

    return (
      <View
        pointerEvents="box-none"
        style={[styles.wrap, styles.detailRow, { paddingBottom: rt.insets.bottom + theme.space.sm }]}>
        {/* Mark-today pill */}
        <View style={styles.detailPill}>
          <TodayToggle
            done={done}
            color={habit?.color}
            onPress={() => {
              if (habitId) toggleCompletion(habitId, today);
            }}
          />
        </View>

        {/* View selector pill */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={mode === 'month' ? 'View total' : 'View calendar'}
          onPress={() => {
            haptics.selection();
            detailUI$.mode.set(mode === 'month' ? 'accumulation' : 'month');
          }}
          style={({ pressed }) => [styles.detailPill, styles.viewToggle, pressed && styles.pressed]}>
          <SymbolView
            name={mode === 'month' ? 'square.grid.3x3.fill' : 'calendar'}
            size={24}
            tintColor={theme.colors.textPrimary}
          />
          <Text style={styles.viewToggleLabel}>{mode === 'month' ? 'View total' : 'View calendar'}</Text>
        </Pressable>
      </View>
    );
  }

  // Main context: three buttons spread across the bottom —
  // left Settings (opens the modal) · center Create · right view-change.
  const overview = homeUI$.overview.get();

  return (
    <Animated.View
      pointerEvents="box-none"
      style={[
        styles.wrap,
        styles.spread,
        { paddingBottom: rt.insets.bottom + theme.space.sm },
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
});

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

const styles = StyleSheet.create((theme) => ({
  wrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
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
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4, // the two pills sit 4px apart
  },
  detailPill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.space.sm,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.card,
    borderWidth: 1,
    borderColor: theme.colors.separator,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  viewToggle: {
    gap: theme.space.xs,
    height: 38, // match the check pill (TodayToggle is 38)
    paddingRight: theme.space.sm,
  },
  viewToggleLabel: {
    fontSize: theme.font.body,
    fontWeight: theme.weight.semibold,
    color: theme.colors.textPrimary,
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
