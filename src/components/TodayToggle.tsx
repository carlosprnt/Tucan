import { SymbolView } from 'expo-symbols';
import { Pressable } from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';

interface TodayToggleProps {
  done: boolean;
  onPress: () => void;
  /** Optional premium habit color; falls back to monochrome ink. */
  color?: string | null;
}

/** Circular mark-today control: filled when done, outlined ring when not. */
export function TodayToggle({ done, onPress, color }: TodayToggleProps) {
  const { theme } = useUnistyles();
  const fill = color ?? theme.colors.dotDone;

  return (
    <Pressable
      hitSlop={12}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        done ? { backgroundColor: fill, borderColor: fill } : styles.todo,
        pressed && styles.pressed,
      ]}>
      {done && (
        <SymbolView
          name="checkmark"
          size={18}
          weight="bold"
          tintColor={theme.colors.canvas}
        />
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create((theme) => ({
  base: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
  todo: {
    backgroundColor: 'transparent',
    borderColor: theme.colors.dotMissed,
  },
  pressed: {
    opacity: 0.6,
  },
}));
