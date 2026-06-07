import { SymbolView } from 'expo-symbols';
import { Pressable, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';

import { haptics } from '@/lib/haptics';

export type DetailViewMode = 'month' | 'accumulation';

interface DetailActionBarProps {
  done: boolean;
  onToggleToday: () => void;
  mode: DetailViewMode;
  onToggleMode: () => void;
  color?: string | null;
}

/**
 * Contextual floating bar shown inside a habit's detail. Replaces the main tab
 * bar with two actions: mark today done, and switch Month <-> All time.
 */
export function DetailActionBar({
  done,
  onToggleToday,
  mode,
  onToggleMode,
  color,
}: DetailActionBarProps) {
  const { theme, rt } = useUnistyles();
  const accent = color ?? theme.colors.dotDone;

  return (
    <Animated.View
      entering={FadeInDown.duration(260)}
      pointerEvents="box-none"
      style={[styles.wrap, { paddingBottom: rt.insets.bottom + theme.space.sm }]}>
      <View style={styles.bar}>
        <Pressable
          hitSlop={8}
          style={({ pressed }) => [styles.item, pressed && styles.pressed]}
          accessibilityRole="button"
          accessibilityLabel={done ? 'Mark today not done' : 'Mark today done'}
          accessibilityState={{ checked: done }}
          onPress={() => {
            if (done) haptics.light();
            else haptics.medium();
            onToggleToday();
          }}>
          <View
            style={[
              styles.check,
              done ? { backgroundColor: accent, borderColor: accent } : styles.checkTodo,
            ]}>
            <SymbolView
              name="checkmark"
              size={17}
              weight="bold"
              tintColor={done ? theme.colors.canvas : theme.colors.textMuted}
            />
          </View>
          <Text style={styles.label}>Today</Text>
        </Pressable>

        <View style={styles.divider} />

        <Pressable
          hitSlop={8}
          style={({ pressed }) => [styles.item, pressed && styles.pressed]}
          accessibilityRole="button"
          accessibilityLabel={mode === 'month' ? 'Show all time' : 'Show month'}
          onPress={() => {
            haptics.selection();
            onToggleMode();
          }}>
          <SymbolView
            name={mode === 'month' ? 'calendar' : 'square.grid.3x3.fill'}
            size={24}
            tintColor={theme.colors.textPrimary}
          />
          <Text style={styles.label}>{mode === 'month' ? 'Month' : 'All time'}</Text>
        </Pressable>
      </View>
    </Animated.View>
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
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.space.lg,
    paddingHorizontal: theme.space.xl,
    paddingVertical: theme.space.sm,
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
  item: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    minWidth: 56,
    paddingVertical: theme.space.xs,
  },
  pressed: {
    opacity: 0.6,
  },
  check: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
  checkTodo: {
    backgroundColor: 'transparent',
    borderColor: theme.colors.dotMissed,
  },
  divider: {
    width: 1,
    height: 28,
    backgroundColor: theme.colors.separator,
  },
  label: {
    fontSize: theme.font.caption,
    color: theme.colors.textSecondary,
  },
}));
