import { SymbolView } from 'expo-symbols';
import { Text } from 'react-native';

import { habitIcon, isEmojiIcon } from '@/lib/icons';

/**
 * Renders a habit's icon, whether it's an SF Symbol (tinted) or an emoji
 * (drawn as text). Keeps emoji + symbol habits visually consistent wherever
 * the icon appears (cards, overview, detail).
 */
export function HabitGlyph({
  icon,
  size,
  color,
}: {
  icon: string | null | undefined;
  size: number;
  color: string;
}) {
  if (isEmojiIcon(icon)) {
    // Emoji glyphs render a touch smaller than the SF Symbol box looks.
    return <Text style={{ fontSize: size }}>{icon}</Text>;
  }
  return <SymbolView name={habitIcon(icon)} size={size} tintColor={color} />;
}
