import { SymbolView, type SFSymbol } from 'expo-symbols';
import { useState } from 'react';
import {
  FlatList,
  Modal,
  Pressable,
  SafeAreaView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';

import { HABIT_ICON_SUGGESTIONS } from '@/lib/icons';
import { haptics } from '@/lib/haptics';

// Emojis grouped by a search keyword (used so the search box can match them
// even though individual emojis don't carry names). Flattened + de-duped into
// one list shown under a single "Emojis" tab.
const EMOJI_GROUPS: Record<string, string[]> = {
  faces: ['😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂', '🙂', '🙃', '😉', '😊', '😇', '🥰', '😍', '🤩', '😘', '😗', '😚', '😙', '🥲', '😋', '😛', '😜', '🤪', '😌', '😔', '😑', '😐', '😶', '😏', '😒', '🙁', '☹️', '😲', '😞', '😖', '😢', '😭', '😤', '😠', '😡', '🤬', '😈', '👿', '💀', '☠️', '💩', '🤡', '👹', '👺', '👻', '👽', '👾', '🤖'],
  hands: ['👋', '🤚', '🖐️', '✋', '🖖', '👌', '🤌', '🤏', '✌️', '🤞', '🫰', '🤟', '🤘', '🤙', '👍', '👎', '✊', '👊', '🤛', '🤜', '👏', '🙌', '👐', '🤲', '🤝', '🦾', '💪'],
  hearts: ['❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔', '💕', '💞', '💓', '💗', '💖', '💘', '💝', '💟'],
  animals: ['🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯', '🦁', '🐮', '🐷', '🐸', '🐵', '🙈', '🙉', '🙊', '🐒', '🐔', '🐧', '🐦', '🐤', '🦆', '🦅', '🦉', '🐺', '🐗', '🐴', '🦄', '🐝', '🐛', '🦋', '🐌', '🐞', '🐜', '🐢', '🐍', '🦖', '🐙', '🦑', '🦐', '🦀', '🐠', '🐟', '🐬', '🐳', '🐋', '🦈', '🐊', '🐅', '🦓', '🦍', '🐘', '🦏', '🐪', '🦒', '🐃', '🐄', '🐎', '🐖', '🐏', '🐑'],
  food: ['🍏', '🍎', '🍐', '🍊', '🍋', '🍌', '🍉', '🍇', '🍓', '🍈', '🍒', '🍑', '🥭', '🍍', '🥥', '🥑', '🍆', '🍅', '🌶️', '🌽', '🥒', '🥬', '🥦', '🧄', '🧅', '🍄', '🥜', '🌰', '🍞', '🥐', '🥖', '🥨', '🥯', '🥞', '🧇', '🥚', '🍳', '🥓', '🍗', '🌭', '🍔', '🍟', '🍕', '🥪', '🥙', '🧆', '🌮', '🌯', '🥗', '🍝', '🍜', '🍲', '🍛', '🍣', '🍱', '🥟', '🍤', '🍙', '🍚', '🍥', '🍢', '🍡', '🍧', '🍨', '🍦', '🍰', '🎂', '🧁', '🍮', '🍭', '🍬', '🍫', '🍿', '🍩', '🍪', '🍯', '🥛', '🥤', '☕', '🍵', '🍶', '🍷', '🍸', '🍹', '🍺', '🍻'],
  sport: ['⚽', '🏀', '🏈', '⚾', '🥎', '🎾', '🏐', '🏉', '🥏', '🎳', '🏓', '🏸', '🏒', '🏑', '🥍', '🏏', '⛳', '⛸️', '🎣', '🎽', '🎿', '⛷️', '🏂', '🪂', '🏋️', '🤼', '🤸', '⛹️', '🤺', '🤾', '🏌️', '🏇', '🧘', '🏄', '🏊', '🚣', '🚴', '🚵', '🎯'],
  travel: ['🚗', '🚕', '🚙', '🚌', '🏎️', '🚓', '🚑', '🚒', '🏍️', '🛵', '🚲', '🛴', '🛹', '✈️', '🛫', '🚁', '⛵', '🚤', '🚢', '🚂', '🚆', '🚇', '🚊', '🗺️', '🧭'],
  objects: ['📱', '💻', '⌨️', '🖥️', '🖨️', '🕹️', '💾', '💿', '🎥', '📺', '📷', '📸', '📹', '📞', '☎️', '📻', '🎙️', '⏰', '⌚', '⏳', '🔋', '🔌', '💡', '🔦', '🕯️', '🧯', '💸', '💵', '💰', '💳', '✉️', '📦', '✏️', '✒️', '🖊️', '📝', '📁', '📅', '📈', '📊', '📚', '📖', '🔧', '🔨', '⚙️', '🔪', '🗝️', '🔒', '🔑'],
  symbols: ['⭐', '🌟', '✨', '⚡', '🔥', '💧', '🌈', '☀️', '🌙', '⛅', '☁️', '❄️', '🌸', '🌺', '🌻', '🌹', '🌷', '🌼', '🌱', '🌲', '🌳', '🍀', '🎵', '🎶', '🎸', '🎹', '🎺', '🥁', '🎨', '🎬', '🎮', '🧩', '🎲', '🎯', '🏆', '🥇', '🎖️', '🏅', '💎', '👑', '🎁', '🎉', '🎊'],
};

interface EmojiItem {
  char: string;
  kw: string;
}

// Flatten + de-dupe (an emoji keeps the first group it appears in).
const EMOJIS: EmojiItem[] = (() => {
  const seen = new Set<string>();
  const out: EmojiItem[] = [];
  for (const [kw, chars] of Object.entries(EMOJI_GROUPS)) {
    for (const char of chars) {
      if (seen.has(char)) continue;
      seen.add(char);
      out.push({ char, kw });
    }
  }
  return out;
})();

// Icons: the same SF Symbols we surface as quick-select in the form.
const ICONS = HABIT_ICON_SUGGESTIONS;

type Tab = 'emojis' | 'icons';

interface IconColorPickerModalProps {
  visible: boolean;
  currentIcon: SFSymbol | string;
  onSelect: (icon: SFSymbol | string) => void;
  onClose: () => void;
}

export function IconColorPickerModal({
  visible,
  currentIcon,
  onSelect,
  onClose,
}: IconColorPickerModalProps) {
  const { theme } = useUnistyles();
  const [selectedIcon, setSelectedIcon] = useState<SFSymbol | string>(currentIcon);
  const [tab, setTab] = useState<Tab>('emojis');
  const [search, setSearch] = useState('');

  const q = search.trim().toLowerCase();
  const isEmoji = /\p{Extended_Pictographic}/u.test(selectedIcon);

  const filteredEmojis = q
    ? EMOJIS.filter((e) => e.kw.includes(q) || e.char === search.trim())
    : EMOJIS;
  const filteredIcons = q
    ? ICONS.filter((i) => i.label.toLowerCase().includes(q) || i.key.includes(q))
    : ICONS;

  const handleConfirm = () => {
    haptics.success();
    onSelect(selectedIcon);
    onClose();
  };

  const handleClose = () => {
    setSearch('');
    onClose();
  };

  const switchTab = (t: Tab) => {
    haptics.selection();
    setSearch('');
    setTab(t);
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.canvas }]}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={handleClose} hitSlop={12}>
            <Text style={styles.closeButton}>Cancel</Text>
          </Pressable>
          <View style={styles.preview}>
            {isEmoji ? (
              <Text style={styles.emojiPreview}>{selectedIcon}</Text>
            ) : (
              <SymbolView
                name={selectedIcon as SFSymbol}
                size={30}
                tintColor={theme.colors.textPrimary}
              />
            )}
          </View>
          <Pressable onPress={handleConfirm} hitSlop={12}>
            <Text style={styles.confirmButton}>Done</Text>
          </Pressable>
        </View>

        {/* Tabs */}
        <View style={styles.tabBar}>
          {(['emojis', 'icons'] as Tab[]).map((t) => (
            <Pressable
              key={t}
              onPress={() => switchTab(t)}
              style={[styles.tab, tab === t && styles.tabActive]}>
              <Text style={[styles.tabLabel, tab === t && styles.tabLabelActive]}>
                {t === 'emojis' ? 'Emojis' : 'Icons'}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* Search */}
        <View style={styles.searchWrap}>
          <SymbolView name="magnifyingglass" size={16} tintColor={theme.colors.textMuted} />
          <TextInput
            placeholder={tab === 'emojis' ? 'Search emojis' : 'Search icons'}
            placeholderTextColor={theme.colors.textMuted}
            value={search}
            onChangeText={setSearch}
            style={[styles.searchInput, { color: theme.colors.textPrimary }]}
            autoCorrect={false}
            autoCapitalize="none"
          />
        </View>

        {/* Grid */}
        {tab === 'emojis' ? (
          <FlatList
            key="emojis"
            data={filteredEmojis}
            numColumns={7}
            keyboardShouldPersistTaps="handled"
            columnWrapperStyle={styles.columnWrapper}
            contentContainerStyle={styles.gridContent}
            keyExtractor={(item) => item.char}
            renderItem={({ item }) => {
              const selected = item.char === selectedIcon;
              return (
                <Pressable
                  onPress={() => {
                    haptics.selection();
                    setSelectedIcon(item.char);
                  }}
                  style={[styles.emojiCell, selected && styles.cellSelected]}>
                  <Text style={styles.emoji}>{item.char}</Text>
                </Pressable>
              );
            }}
          />
        ) : (
          <FlatList
            key="icons"
            data={filteredIcons}
            numColumns={6}
            keyboardShouldPersistTaps="handled"
            columnWrapperStyle={styles.columnWrapper}
            contentContainerStyle={styles.gridContent}
            keyExtractor={(item) => item.key}
            renderItem={({ item }) => {
              const selected = item.key === selectedIcon;
              return (
                <Pressable
                  onPress={() => {
                    haptics.selection();
                    setSelectedIcon(item.key);
                  }}
                  style={[styles.iconCell, selected && styles.cellSelected]}>
                  <SymbolView
                    name={item.key}
                    size={24}
                    tintColor={selected ? theme.colors.accent : theme.colors.textPrimary}
                  />
                </Pressable>
              );
            }}
          />
        )}
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
  },
  preview: {
    width: 52,
    height: 52,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emojiPreview: {
    fontSize: 30,
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
    gap: theme.space.lg,
    paddingHorizontal: theme.space.lg,
    paddingTop: theme.space.xs,
  },
  tab: {
    paddingVertical: theme.space.sm,
  },
  tabActive: {
    borderBottomWidth: 2,
    borderBottomColor: theme.colors.textPrimary,
  },
  tabLabel: {
    fontSize: theme.font.body,
    fontWeight: theme.weight.semibold,
    color: theme.colors.textSecondary,
  },
  tabLabelActive: {
    color: theme.colors.textPrimary,
  },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.space.sm,
    marginHorizontal: theme.space.lg,
    marginTop: theme.space.md,
    paddingHorizontal: theme.space.md,
    height: 40,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.card,
  },
  searchInput: {
    flex: 1,
    fontSize: theme.font.body,
    padding: 0,
  },
  gridContent: {
    paddingHorizontal: theme.space.md,
    paddingTop: theme.space.md,
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
  iconCell: {
    width: '15%',
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.card,
  },
  cellSelected: {
    backgroundColor: theme.colors.card,
    borderWidth: 2,
    borderColor: theme.colors.accent,
  },
  emoji: {
    fontSize: 26,
  },
}));
