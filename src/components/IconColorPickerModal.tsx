import { SymbolView, type SFSymbol } from 'expo-symbols';
import { useState } from 'react';
import {
  FlatList,
  Modal,
  Pressable,
  SafeAreaView,
  Text,
  View,
} from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';

import { HABIT_ICON_SUGGESTIONS } from '@/lib/icons';
import { HABIT_COLORS } from '@/lib/colors';
import { haptics } from '@/lib/haptics';

const EMOJI_CATEGORIES = {
  smileys: ['😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂', '🙂', '🙃', '😉', '😊', '😇', '🥰', '😍', '🤩', '😘', '😗', '😚', '😙', '🥲', '😋', '😛', '😜', '🤪', '😌', '😔', '😑', '😐', '😶', '😏', '😒', '🙁', '☹️', '😲', '😞', '😖', '😢', '😭', '😤', '😠', '😡', '🤬', '😈', '👿', '💀', '☠️', '💩', '🤡', '👹', '👺', '👻', '👽', '👾', '🤖'],
  nature: ['🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯', '🦁', '🐮', '🐷', '🐸', '🐵', '🙈', '🙉', '🙊', '🐒', '🐔', '🐧', '🐦', '🐤', '🐣', '🐥', '🦆', '🦅', '🦉', '🦇', '🐺', '🐗', '🐴', '🦄', '🐝', '🐛', '🦋', '🐌', '🐞', '🐜', '🦟', '🦗', '🕷️', '🦂', '🐢', '🐍', '🦎', '🦖', '🦕', '🐙', '🦑', '🦐', '🦞', '🦀', '🐡', '🐠', '🐟', '🐬', '🐳', '🐋', '🦈', '🐊', '🐅', '🐆', '🦓', '🦍', '🦧', '🐘', '🦛', '🦏', '🐪', '🐫', '🦒', '🦘', '🐃', '🐂', '🐄', '🐎', '🐖', '🐏', '🐑', '🧀', '🍎', '🍊', '🍋', '🍌', '🍉', '🍇', '🍓', '🍈', '🍒', '🍑', '🥭', '🍍', '🥥', '🥑', '🍆', '🍅', '🌶️', '🌽', '🥒', '🥬', '🥦', '🧄', '🧅', '🍄', '🥜', '🌰', '🍞', '🥐', '🥖', '🥨', '🥯', '🥞', '🧇', '🥚', '🍳', '🧈', '🥞', '🥓', '🥞', '🍖', '🍗', '🌭', '🍔', '🍟', '🍕', '🥪', '🥙', '🧆', '🌮', '🌯', '🥗', '🥘', '🥫', '🍝', '🍜', '🍲', '🍛', '🍣', '🍱', '🥟', '🦪', '🍤', '🍙', '🍚', '🍘', '🍥', '🥠', '🥮', '🍢', '🍡', '🍧', '🍨', '🍦', '🍰', '🎂', '🧁', '🍮', '🍭', '🍬', '🍫', '🍿', '🍩', '🍪', '🌰', '🍯', '🥛', '🥤', '☕', '🍵', '🍶', '🍾', '🍷', '🍸', '🍹', '🍺', '🍻', '🥂', '🥃'],
  activity: ['⚽', '🏀', '🏈', '⚾', '🥎', '🎾', '🏐', '🏉', '🥏', '🎳', '🏓', '🏸', '🏒', '🏑', '🥍', '🏏', '🥅', '⛳', '⛸️', '🎣', '🎽', '🎿', '⛷️', '🏂', '🪂', '🏋️', '🤼', '🤸', '⛹️', '🤺', '🤾', '🏌️', '🏇', '🧘', '🏄', '🏊', '🤽', '🚣', '🚴', '🚵', '🎯', '🪀', '🪃', '🎣', '🎪', '🎨', '🎬', '🎤', '🎧', '🎼', '🎹', '🥁', '🎷', '🎺', '🎸', '🎻', '🎲', '🧩', '🚗', '🚕', '🚙', '🚌', '🚎', '🏎️', '🚓', '🚑', '🚒', '🚐', '🛻', '🚚', '🚛', '🚜', '🏍️', '🏎️', '🛵', '🦯', '🦽', '🦼', '🛺', '🚲', '🛴', '🛹', '🛼', '🚏', '⛽', '🚨', '🚔', '🚍', '🚘', '🚖', '🚡', '🚠', '🚟', '🚃', '🚋', '🚞', '🚝', '🚄', '🚅', '🚈', '🚂', '🚆', '🚇', '🚇', '🚊', '🚉', '✈️', '🛫', '🛬', '🛩️', '💺', '🛰️', '🚁', '🛶', '⛵', '🚤', '🛳️', '🛲', '🚢', '🔧', '🔨', '⚒️', '🛠️', '⛏️', '🔩', '⚙️', '🧱', '⛓️', '🧲', '🔫', '💣', '🔪', '🗡️', '🛡️', '🚬', '⚰️', '⚱️', '🏺', '🔮', '📱', '📲', '💻', '⌨️', '🖥️', '🖨️', '🖱️', '🖲️', '🕹️', '🗜️', '💽', '💾', '💿', '📀', '🧮', '🎥', '🎬', '📺', '📷', '📸', '📹', '🎞️', '📞', '☎️', '📟', '📠', '📺', '📻', '🎙️', '🎚️', '🎛️', '🧭', '⏱️', '⏲️', '⏰', '🕰️', '⌚', '⌛', '⏳', '📡', '🔋', '🔌', '💡', '🔦', '🕯️', '🪔', '🧯', '🛢️', '💸', '💵', '💴', '💶', '💷', '💰', '💳', '🧾', '✉️', '📩', '📨', '📤', '📥', '📦', '🏷️', '🧧', '📪', '📫', '📬', '📭', '📮', '✏️', '✒️', '🖋️', '🖊️', '🖌️', '🖍️', '📝', '📁', '📂', '📅', '📆', '🗒️', '🗃️', '🗳️', '🗄️', '📋', '📇', '📈', '📉', '📊', '📓', '📔', '📒', '📕', '📖', '📗', '📘', '📙', '📚', '📞', '📖', '🧷', '🧷', '🧹', '🧺', '🧻', '🧼', '🧽', '🧯', '🛒', '🚬', '⚰️', '⚱️'],
  food: ['🍏', '🍎', '🍐', '🍊', '🍋', '🍌', '🍉', '🍇', '🍓', '🍈', '🍒', '🍑', '🥭', '🍍', '🥥', '🥑', '🍆', '🍅', '🌶️', '🌽', '🥒', '🥬', '🥦', '🧄', '🧅', '🍄', '🥜', '🌰', '🍞', '🥐', '🥖', '🥨', '🥯', '🥞', '🧇', '🥚', '🍳', '🧈', '🥞', '🥓', '🍗', '🌭', '🍔', '🍟', '🍕', '🥪', '🥙', '🧆', '🌮', '🌯', '🥗', '🥘', '🥫', '🍝', '🍜', '🍲', '🍛', '🍣', '🍱', '🥟', '🦪', '🍤', '🍙', '🍚', '🍘', '🍥', '🥠', '🥮', '🍢', '🍡', '🍧', '🍨', '🍦', '🍰', '🎂', '🧁', '🍮', '🍭', '🍬', '🍫', '🍿', '🍩', '🍪', '🌰', '🍯', '🥛', '🥤', '☕', '🍵', '🍶', '🍾', '🍷', '🍸', '🍹', '🍺', '🍻'],
  symbols: ['❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔', '💕', '💞', '💓', '💗', '💖', '💘', '💝', '💟', '👋', '🤚', '🖐️', '✋', '🖖', '👌', '🤌', '🤏', '✌️', '🤞', '🫰', '🤟', '🤘', '🤙', '👍', '👎', '✊', '👊', '🤛', '🤜', '👏', '🙌', '👐', '🤲', '🤝', '🤜', '🤛', '🦾', '🦿', '👂', '👃', '🧠', '🦷', '🦴', '👀', '👁️', '👅', '👄', '🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯', '🦁', '🐮', '🐷', '🐸', '🐵', '🙈', '🙉', '🙊', '🐒'],
};

interface IconColorPickerModalProps {
  visible: boolean;
  currentIcon: SFSymbol | string;
  currentColor: string | null;
  onSelect: (icon: SFSymbol | string, color: string | null) => void;
  onClose: () => void;
}

export function IconColorPickerModal({
  visible,
  currentIcon,
  currentColor,
  onSelect,
  onClose,
}: IconColorPickerModalProps) {
  const { theme } = useUnistyles();
  const [selectedIcon, setSelectedIcon] = useState<SFSymbol | string>(currentIcon);
  const [selectedColor, setSelectedColor] = useState<string | null>(currentColor);
  const [tab, setTab] = useState<keyof typeof EMOJI_CATEGORIES>('smileys');

  const isEmoji = selectedIcon.length === 2 || /\p{Emoji}/u.test(selectedIcon);
  const currentEmojis = EMOJI_CATEGORIES[tab];

  const handleConfirm = () => {
    haptics.success();
    onSelect(selectedIcon, selectedColor);
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.canvas }]}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={onClose} hitSlop={12}>
            <Text style={styles.closeButton}>Cancel</Text>
          </Pressable>
          <View style={styles.preview}>
            {isEmoji ? (
              <Text style={styles.emojiPreview}>{selectedIcon}</Text>
            ) : (
              <SymbolView
                name={selectedIcon as SFSymbol}
                size={40}
                tintColor={selectedColor ?? theme.colors.textPrimary}
              />
            )}
          </View>
          <Pressable onPress={handleConfirm} hitSlop={12}>
            <Text style={styles.confirmButton}>Done</Text>
          </Pressable>
        </View>

        {/* Tabs */}
        <View style={styles.tabBar}>
          {(Object.keys(EMOJI_CATEGORIES) as Array<keyof typeof EMOJI_CATEGORIES>).map((t) => (
            <Pressable
              key={t}
              onPress={() => {
                haptics.selection();
                setTab(t);
              }}
              style={[styles.tab, tab === t && styles.tabActive]}>
              <Text style={[styles.tabLabel, tab === t && styles.tabLabelActive]}>
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* Emoji Grid */}
        <FlatList
          key={`emoji-${tab}`}
          data={currentEmojis}
          numColumns={7}
          columnWrapperStyle={styles.columnWrapper}
          contentContainerStyle={styles.gridContent}
          keyExtractor={(item, i) => `${item}-${i}`}
          renderItem={({ item }) => {
            const selected = item === selectedIcon;
            return (
              <Pressable
                onPress={() => {
                  haptics.selection();
                  setSelectedIcon(item);
                }}
                style={[styles.emojiCell, selected && styles.emojiCellSelected]}>
                <Text style={styles.emoji}>{item}</Text>
              </Pressable>
            );
          }}
        />

        {/* Color Picker */}
        <View style={styles.colorSection}>
          <Text style={[styles.sectionLabel, { color: theme.colors.textSecondary }]}>
            Color
          </Text>
          <View style={styles.colorRow}>
            {HABIT_COLORS.map((opt) => {
              const selected = opt.value === selectedColor;
              const swatch = opt.value ?? theme.colors.ink;
              return (
                <Pressable
                  key={opt.label}
                  hitSlop={8}
                  onPress={() => {
                    haptics.selection();
                    setSelectedColor(opt.value);
                  }}
                  style={[styles.swatch, { backgroundColor: swatch }]}>
                  {selected && (
                    <Text style={styles.swatchCheck}>✓</Text>
                  )}
                </Pressable>
              );
            })}
          </View>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create((theme) => ({
  container: {
    flex: 1,
    backgroundColor: theme.colors.canvas,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.space.lg,
    paddingVertical: theme.space.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.separator,
  },
  preview: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: theme.colors.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emojiPreview: {
    fontSize: 36,
  },
  closeButton: {
    fontSize: theme.font.body,
    color: theme.colors.textSecondary,
  },
  confirmButton: {
    fontSize: theme.font.body,
    fontWeight: theme.weight.semibold,
    color: theme.colors.accent,
  },
  tabBar: {
    flexDirection: 'row',
    gap: theme.space.md,
    paddingHorizontal: theme.space.lg,
    paddingVertical: theme.space.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.separator,
  },
  tab: {
    paddingVertical: theme.space.sm,
    paddingHorizontal: theme.space.md,
  },
  tabActive: {
    borderBottomWidth: 2,
    borderBottomColor: theme.colors.textPrimary,
  },
  tabLabel: {
    fontSize: theme.font.caption,
    fontWeight: theme.weight.medium,
    color: theme.colors.textSecondary,
  },
  tabLabelActive: {
    color: theme.colors.textPrimary,
  },
  gridContent: {
    paddingHorizontal: theme.space.md,
    paddingVertical: theme.space.md,
    paddingBottom: theme.space.xl,
  },
  columnWrapper: {
    justifyContent: 'space-between',
    marginBottom: theme.space.sm,
  },
  emojiCell: {
    width: '13%',
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: theme.radius.md,
  },
  emojiCellSelected: {
    backgroundColor: theme.colors.card,
    borderWidth: 2,
    borderColor: theme.colors.accent,
  },
  emoji: {
    fontSize: 24,
  },
  colorSection: {
    paddingHorizontal: theme.space.lg,
    paddingVertical: theme.space.md,
    borderTopWidth: 1,
    borderTopColor: theme.colors.separator,
  },
  sectionLabel: {
    fontSize: theme.font.caption,
    fontWeight: theme.weight.medium,
    marginBottom: theme.space.md,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  colorRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.space.md,
  },
  swatch: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  swatchCheck: {
    fontSize: 18,
    fontWeight: theme.weight.bold,
    color: theme.colors.canvas,
  },
}));
