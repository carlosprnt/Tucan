import { observer } from '@legendapp/state/react';
import { usePathname, useRouter } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useEffect, type ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  FadeOut,
  LinearTransition,
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

const BAR_LAYOUT = LinearTransition.duration(240);
// Fixed region height so the bar morphs from its center (vertically centered).
const REGION_HEIGHT = 68;

/**
 * Single persistent floating bar. It stays mounted across navigation and morphs
 * its items by context — main tabs (Habits · + · Settings) or, inside a habit,
 * contextual actions (mark today · Month/All-time). The detail bar is smaller;
 * the bar resizes from its center while the items crossfade.
 */
export const AppBar = observer(function AppBar() {
  const pathname = usePathname();
  const router = useRouter();
  const { theme, rt } = useUnistyles();

  // Entrance: rise from below + fade in, fast then decelerating (ease-out),
  // shortly after the screen appears. Plays once on mount.
  const enter = useSharedValue(0);
  useEffect(() => {
    enter.value = withDelay(
      350,
      withTiming(1, { duration: 600, easing: Easing.out(Easing.cubic) }),
    );
  }, [enter]);
  const enterStyle = useAnimatedStyle(() => ({
    opacity: enter.value,
    transform: [{ translateY: (1 - enter.value) * 40 }],
  }));

  // Over the create/edit sheet, keep the main bar mounted behind it so the
  // bottom nav stays visible as the sheet is swiped away (no flash/disappear).
  const isCreate = pathname === '/habit/new';
  const isDetail = pathname.startsWith('/habit/') && !isCreate;

  // Detail bar is a bit smaller and tighter.
  const barPadding = isDetail ? theme.space.xs : theme.space.sm;
  const gap = isDetail ? theme.space.sm : theme.space.lg;
  const contentHeight = isDetail ? 44 : 52;

  const renderDetailItems = (): ReactNode => {
    const habitId = detailUI$.habitId.get();
    const mode = detailUI$.mode.get();
    const today = todayKey();
    const habit = habitId ? getHabit(habitId) : undefined;
    const done = habitId ? completedDates(habitId).has(today) : false;

    return (
      <>
        <TodayToggle
          done={done}
          color={habit?.color}
          onPress={() => {
            if (habitId) toggleCompletion(habitId, today);
          }}
        />

        <Pressable
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={mode === 'month' ? 'Calendar view' : 'Total view'}
          onPress={() => {
            haptics.selection();
            detailUI$.mode.set(mode === 'month' ? 'accumulation' : 'month');
          }}
          style={({ pressed }) => [styles.viewToggle, pressed && styles.pressed]}>
          <SymbolView
            name={mode === 'month' ? 'calendar' : 'square.grid.3x3.fill'}
            size={24}
            tintColor={theme.colors.textPrimary}
          />
          <Text style={styles.viewToggleLabel}>{mode === 'month' ? 'Calendar' : 'Total'}</Text>
        </Pressable>
      </>
    );
  };

  if (isDetail) {
    return (
      <View
        pointerEvents="box-none"
        style={[styles.wrap, { paddingBottom: rt.insets.bottom + theme.space.sm }]}>
        <View style={styles.region} pointerEvents="box-none">
          <Animated.View layout={BAR_LAYOUT} style={[styles.bar, { padding: barPadding }]}>
            <View style={[styles.sizer, { gap, height: contentHeight }]} pointerEvents="none">
              {renderDetailItems()}
            </View>
            <Animated.View
              key="detail"
              entering={FadeIn.duration(220)}
              exiting={FadeOut.duration(140)}
              style={[styles.layer, { gap }]}>
              {renderDetailItems()}
            </Animated.View>
          </Animated.View>
        </View>
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
  region: {
    height: REGION_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bar: {
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
  sizer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    opacity: 0,
  },
  layer: {
    ...StyleSheet.absoluteFillObject,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.space.xs,
    height: 44,
    paddingLeft: theme.space.sm,
    paddingRight: theme.space.lg,
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
