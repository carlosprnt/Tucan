import { useState } from 'react';
import { type LayoutChangeEvent, View } from 'react-native';
import { useUnistyles } from 'react-native-unistyles';

/** A dotted divider — a character detail used instead of solid hairlines. */
export function DottedSeparator({ inset = 0 }: { inset?: number }) {
  const { theme } = useUnistyles();
  const [width, setWidth] = useState(0);
  const dot = 1.5;
  const gap = 5;
  const count = width > 0 ? Math.floor((width + gap) / (dot + gap)) : 0;

  return (
    <View
      onLayout={(e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width)}
      style={{ flexDirection: 'row', gap, marginHorizontal: inset, height: dot }}>
      {Array.from({ length: count }, (_, i) => (
        <View
          key={i}
          style={{
            width: dot,
            height: dot,
            borderRadius: dot / 2,
            backgroundColor: theme.colors.separator,
          }}
        />
      ))}
    </View>
  );
}
