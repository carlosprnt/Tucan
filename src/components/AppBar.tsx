import { observer } from '@legendapp/state/react';
import { usePathname, useRouter } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import type { ReactNode } from 'react';
import { Pressable, View } from 'react-native';
import Animated, { FadeIn, FadeOut, LinearTransition } from 'react-native-reanimated';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';

import { TodayToggle } from '@/components/TodayToggle';
import { todayKey } from '@/lib/date';
import { haptics } from '@/lib/haptics';
import { completedDates, detailUI$, getHabit, toggleCompletion } from '@/store';

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

  // Hidden over the create/edit sheet.
  if (pathname === '/habit/new') return null;

  const isDetail = pathname.startsWith('/habit/');

  // Detail bar is a bit smaller and tighter.
  const barPadding = isDetail ? theme.space.xs : theme.space.sm;
  const gap = isDetail ? theme.space.sm : theme.space.lg;
  const contentHeight = isDetail ? 44 : 52;

  const renderItems = (): ReactNode => {
    if (isDetail) {
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

          <Item
            onPress={() => {
              haptics.selection();
              detailUI$.mode.set(mode === 'month' ? 'accumulation' : 'month');
            }}
            label={mode === 'month' ? 'Show all time' : 'Show month'}>
            <SymbolView
              name={mode === 'month' ? 'calendar' : 'square.grid.3x3.fill'}
              size={24}
              tintColor={theme.colors.textPrimary}
            />
          </Item>
        </>
      );
    }

    const settingsActive = pathname === '/settings';
    return (
      <>
        <Item
          onPress={() => {
            haptics.selection();
            router.navigate('/');
          }}
          label="Habits"
          selected={!settingsActive}>
          <SymbolView
            name="square.grid.2x2.fill"
            size={26}
            tintColor={!settingsActive ? theme.colors.ink : theme.colors.textMuted}
          />
        </Item>

        <Fab
          onPress={() => {
            haptics.light();
            router.push('/habit/new');
          }}
          color={theme.colors.ink}
          tint={theme.colors.canvas}
        />

        <Item
          onPress={() => {
            haptics.selection();
            router.navigate('/settings');
          }}
          label="Settings"
          selected={settingsActive}>
          <SymbolView
            name="gearshape.fill"
            size={26}
            tintColor={settingsActive ? theme.colors.ink : theme.colors.textMuted}
          />
        </Item>
      </>
    );
  };

  return (
    <View
      pointerEvents="box-none"
      style={[styles.wrap, { paddingBottom: rt.insets.bottom + theme.space.sm }]}>
      <View style={styles.region} pointerEvents="box-none">
        <Animated.View layout={BAR_LAYOUT} style={[styles.bar, { padding: barPadding }]}>
          {/* Invisible sizer in flow defines the bar size for the active items. */}
          <View style={[styles.sizer, { gap, height: contentHeight }]} pointerEvents="none">
            {renderItems()}
          </View>
          {/* Visible layer crossfades on context change without affecting size. */}
          <Animated.View
            key={isDetail ? 'detail' : 'main'}
            entering={FadeIn.duration(220)}
            exiting={FadeOut.duration(140)}
            style={[styles.layer, { gap }]}>
            {renderItems()}
          </Animated.View>
        </Animated.View>
      </View>
    </View>
  );
});

function Item({
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
  return (
    <Pressable
      hitSlop={8}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected }}
      style={({ pressed }) => [styles.item, pressed && styles.pressed]}>
      {children}
    </Pressable>
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
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Create habit"
      style={({ pressed }) => [styles.fab, { backgroundColor: color }, pressed && styles.pressed]}
      onPress={onPress}>
      <SymbolView name="plus" size={26} weight="bold" tintColor={tint} />
    </Pressable>
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
  item: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fab: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.6,
  },
}));
