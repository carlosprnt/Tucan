import { SymbolView } from 'expo-symbols';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';

import { TodayToggle } from '@/components/TodayToggle';
import { haptics } from '@/lib/haptics';
import type { DetailViewMode } from '@/store';

/**
 * The habit-detail bottom bar (lives inside the detail screen so it works when
 * the screen is presented as a modal). Two floating pills: mark-today centered
 * on screen, and the view selector pinned to the right — the check shifts left
 * if it would come within 8px of the view pill.
 */
export function DetailActionBar({
  done,
  color,
  onToggleToday,
  mode,
  onToggleMode,
  onClose,
}: {
  done: boolean;
  color?: string | null;
  onToggleToday: () => void;
  mode: DetailViewMode;
  onToggleMode: () => void;
  onClose: () => void;
}) {
  const { theme } = useUnistyles();
  const [barW, setBarW] = useState(0);
  const [checkW, setCheckW] = useState(0);
  const [viewW, setViewW] = useState(0);
  const [closeW, setCloseW] = useState(0);

  const inset = theme.space.xl; // 24px — match the content side margins
  const gap = theme.space.sm;
  const measured = barW > 0 && checkW > 0 && viewW > 0 && closeW > 0;
  const centeredLeft = (barW - checkW) / 2;
  const viewLeft = barW - inset - viewW;
  const closeRight = inset + closeW;
  const checkLeft = measured
    ? Math.min(
        Math.max(centeredLeft, closeRight + gap), // clear of the left close pill
        viewLeft - gap - checkW, // clear of the right view pill
      )
    : 0;

  const isMonth = mode === 'month';

  return (
    <View
      pointerEvents="box-none"
      style={[styles.wrap, { paddingBottom: theme.space.xl }]}>
      <View style={styles.bar} pointerEvents="box-none" onLayout={(e) => setBarW(e.nativeEvent.layout.width)}>
        {/* Close pill — bottom-left */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Close"
          onLayout={(e) => setCloseW(e.nativeEvent.layout.width)}
          onPress={() => {
            haptics.selection();
            onClose();
          }}
          style={({ pressed }) => [styles.pill, styles.square, styles.closeLeft, pressed && styles.pressed]}>
          <SymbolView name="xmark" size={20} weight="semibold" tintColor={theme.colors.textPrimary} />
        </Pressable>

        {/* Mark-today pill — centered, clamped clear of both side pills */}
        <View
          pointerEvents="box-none"
          style={measured ? [styles.checkClamped, { left: checkLeft }] : styles.checkCenter}>
          <View style={[styles.pill, styles.square]} onLayout={(e) => setCheckW(e.nativeEvent.layout.width)}>
            <TodayToggle done={done} color={color} onPress={onToggleToday} />
          </View>
        </View>

        {/* View selector pill — right edge */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={isMonth ? 'View total' : 'View calendar'}
          onLayout={(e) => setViewW(e.nativeEvent.layout.width)}
          onPress={() => {
            haptics.selection();
            onToggleMode();
          }}
          style={({ pressed }) => [styles.pill, styles.viewToggle, styles.viewRight, pressed && styles.pressed]}>
          <SymbolView
            name={isMonth ? 'square.grid.3x3.fill' : 'calendar'}
            size={24}
            tintColor={theme.colors.textPrimary}
          />
          <Text style={styles.viewToggleLabel}>{isMonth ? 'View total' : 'View calendar'}</Text>
        </Pressable>
      </View>
    </View>
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
  bar: {
    width: '100%',
    height: 54,
    justifyContent: 'center',
  },
  checkCenter: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkClamped: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    justifyContent: 'center',
  },
  viewRight: {
    position: 'absolute',
    right: theme.space.xl, // 24px — match content margins
    top: 0,
    bottom: 0,
  },
  closeLeft: {
    position: 'absolute',
    left: theme.space.xl, // 24px — match content margins
    top: 0,
    bottom: 0,
  },
  square: {
    width: 54, // same square container as the check pill
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 54,
    paddingHorizontal: theme.space.sm,
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
    paddingHorizontal: theme.space.sm + 10,
  },
  viewToggleLabel: {
    fontSize: theme.font.body,
    fontWeight: theme.weight.semibold,
    color: theme.colors.textPrimary,
  },
  pressed: {
    opacity: 0.6,
  },
}));
