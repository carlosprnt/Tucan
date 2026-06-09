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
}: {
  done: boolean;
  color?: string | null;
  onToggleToday: () => void;
  mode: DetailViewMode;
  onToggleMode: () => void;
}) {
  const { theme, rt } = useUnistyles();
  const [barW, setBarW] = useState(0);
  const [checkW, setCheckW] = useState(0);
  const [viewW, setViewW] = useState(0);

  const rightInset = theme.space.lg;
  const measured = barW > 0 && checkW > 0 && viewW > 0;
  const centeredLeft = (barW - checkW) / 2;
  const viewLeft = barW - rightInset - viewW;
  const checkLeft = measured
    ? Math.max(theme.space.sm, Math.min(centeredLeft, viewLeft - theme.space.sm - checkW))
    : 0;

  const isMonth = mode === 'month';

  return (
    <View
      pointerEvents="box-none"
      style={[styles.wrap, { paddingBottom: rt.insets.bottom + theme.space.sm }]}>
      <View style={styles.bar} pointerEvents="box-none" onLayout={(e) => setBarW(e.nativeEvent.layout.width)}>
        {/* Mark-today pill — centered, clamped clear of the view pill */}
        <View
          pointerEvents="box-none"
          style={measured ? [styles.checkClamped, { left: checkLeft }] : styles.checkCenter}>
          <View style={styles.pill} onLayout={(e) => setCheckW(e.nativeEvent.layout.width)}>
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
    right: theme.space.lg,
    top: 0,
    bottom: 0,
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
