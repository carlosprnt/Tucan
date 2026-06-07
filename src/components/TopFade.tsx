import { View } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { useUnistyles } from 'react-native-unistyles';

/**
 * A top fade overlay: content dissolves into the canvas as it scrolls up under
 * the status bar. (A true frosted blur would need expo-blur / a native rebuild.)
 */
export function TopFade({ height }: { height: number }) {
  const { theme } = useUnistyles();
  const canvas = theme.colors.canvas;

  return (
    <View pointerEvents="none" style={{ position: 'absolute', top: 0, left: 0, right: 0, height }}>
      <Svg width="100%" height={height}>
        <Defs>
          <LinearGradient id="topFade" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={canvas} stopOpacity={1} />
            <Stop offset="0.55" stopColor={canvas} stopOpacity={0.9} />
            <Stop offset="1" stopColor={canvas} stopOpacity={0} />
          </LinearGradient>
        </Defs>
        <Rect x="0" y="0" width="100%" height={height} fill="url(#topFade)" />
      </Svg>
    </View>
  );
}
