import { SymbolView, type SFSymbol } from 'expo-symbols';
import { useState } from 'react';
import {
  FlatList,
  Modal,
  Platform,
  Pressable,
  SafeAreaView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';

import { HABIT_ICON_SUGGESTIONS } from '@/lib/icons';
import { haptics } from '@/lib/haptics';

const EMOJIS = [
  '😀', '😍', '🥰', '😂', '🤔', '😎', '🔥', '💪', '⚡', '🚀',
  '🎯', '🏆', '⭐', '🌟', '💎', '🎨', '🎭', '🎪', '🎬', '🎮',
  '🧠', '💡', '🧘', '🏃', '🚴', '🏋️', '🤸', '🧗', '⛹️', '🏊',
  '🥇', '🥈', '🥉', '🏅', '🎖️', '📚', '📖', '✏️', '📝', '📊',
  '🎵', '🎶', '🎸', '🎹', '🎺', '🥁', '📱', '💻', '⌨️', '🖥️',
  '🍎', '🥗', '🍕', '🍔', '🍜', '🍱', '🥘', '☕', '🍵', '🥤',
  '🌈', '⛅', '🌤️', '🌞', '🌙', '⭐', '✨', '🌸', '🌺', '🌻',
];

interface IconPickerModalProps {
  visible: boolean;
  currentIcon: SFSymbol | string;
  onSelect: (icon: SFSymbol | string) => void;
  onClose: () => void;
}

export function IconPickerModal({ visible, currentIcon, onSelect, onClose }: IconPickerModalProps) {
  const { theme, rt } = useUnistyles();
  const [tab, setTab] = useState<'symbols' | 'emoji'>('symbols');
  const [search, setSearch] = useState('');

  const filteredSymbols = search
    ? HABIT_ICON_SUGGESTIONS.filter((opt) =>
        opt.label.toLowerCase().includes(search.toLowerCase()),
      )
    : HABIT_ICON_SUGGESTIONS;

  const filteredEmojis = search
    ? EMOJIS.filter((emoji) => {
        // Simple emoji search by name mapping (can be extended)
        const emojiNames: Record<string, string> = {
          '😀': 'smile', '😍': 'love', '🥰': 'heart', '😂': 'laugh',
          '🤔': 'think', '😎': 'cool', '🔥': 'fire', '💪': 'strong',
        };
        return (emojiNames[emoji]?.includes(search.toLowerCase()) ?? false);
      })
    : EMOJIS;

  const handleSelectIcon = (icon: SFSymbol | string) => {
    haptics.selection();
    onSelect(icon);
  };

  const handleClear = () => {
    haptics.selection();
    onSelect('circle'); // Use the "None" icon
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.canvas }]}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={onClose} hitSlop={12}>
            <Text style={styles.closeButton}>Cancel</Text>
          </Pressable>
          <Text style={styles.title}>Pick an icon</Text>
          <Pressable onPress={handleClear} hitSlop={12}>
            <Text style={styles.clearButton}>Clear</Text>
          </Pressable>
        </View>

        {/* Tabs */}
        <View style={styles.tabBar}>
          {(['symbols', 'emoji'] as const).map((t) => (
            <Pressable
              key={t}
              onPress={() => {
                haptics.selection();
                setTab(t);
                setSearch('');
              }}
              style={[styles.tab, tab === t && styles.tabActive]}>
              <Text style={[styles.tabLabel, tab === t && styles.tabLabelActive]}>
                {t === 'symbols' ? 'Symbols' : 'Emoji'}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* Search */}
        <View style={styles.searchContainer}>
          <TextInput
            placeholder={tab === 'symbols' ? 'Search symbols...' : 'Search emoji...'}
            placeholderTextColor={theme.colors.textMuted}
            value={search}
            onChangeText={setSearch}
            style={[styles.searchInput, { color: theme.colors.textPrimary }]}
          />
        </View>

        {/* Grid - Symbols */}
        {tab === 'symbols' && (
          <FlatList
            key="symbols-grid"
            data={filteredSymbols}
            keyExtractor={(item) => item.key}
            numColumns={5}
            columnWrapperStyle={styles.columnWrapper}
            contentContainerStyle={styles.gridContent}
            renderItem={({ item }) => {
              const selected = item.key === currentIcon;
              return (
                <Pressable
                  onPress={() => handleSelectIcon(item.key)}
                  style={[styles.gridCell, selected && { borderColor: theme.colors.accent }]}>
                  <SymbolView
                    name={item.key}
                    size={28}
                    tintColor={selected ? theme.colors.accent : theme.colors.textPrimary}
                  />
                  <Text style={[styles.cellLabel, selected && { color: theme.colors.accent }]}>
                    {item.label}
                  </Text>
                </Pressable>
              );
            }}
          />
        )}

        {/* Grid - Emoji */}
        {tab === 'emoji' && (
          <FlatList
            key="emoji-grid"
            data={filteredEmojis}
            keyExtractor={(item, i) => `${item}-${i}`}
            numColumns={6}
            columnWrapperStyle={styles.columnWrapper}
            contentContainerStyle={styles.gridContent}
            renderItem={({ item }) => {
              const selected = item === currentIcon;
              return (
                <Pressable
                  onPress={() => handleSelectIcon(item)}
                  style={[styles.emojiCell, selected && styles.emojiCellSelected]}>
                  <Text style={styles.emoji}>{item}</Text>
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
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.separator,
  },
  title: {
    fontSize: theme.font.heading,
    fontWeight: theme.weight.semibold,
    color: theme.colors.textPrimary,
  },
  closeButton: {
    fontSize: theme.font.body,
    color: theme.colors.textSecondary,
  },
  clearButton: {
    fontSize: theme.font.body,
    fontWeight: theme.weight.semibold,
    color: theme.colors.accent,
  },
  tabBar: {
    flexDirection: 'row',
    gap: theme.space.lg,
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
    fontSize: theme.font.body,
    fontWeight: theme.weight.medium,
    color: theme.colors.textSecondary,
  },
  tabLabelActive: {
    color: theme.colors.textPrimary,
  },
  searchContainer: {
    paddingHorizontal: theme.space.lg,
    paddingVertical: theme.space.md,
  },
  searchInput: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.radius.md,
    paddingHorizontal: theme.space.lg,
    paddingVertical: theme.space.md,
    fontSize: theme.font.body,
  },
  gridContent: {
    paddingHorizontal: theme.space.lg,
    paddingBottom: theme.space.xl,
  },
  columnWrapper: {
    justifyContent: 'space-between',
    marginBottom: theme.space.md,
  },
  gridCell: {
    width: '18%',
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.space.xs,
    backgroundColor: theme.colors.card,
    borderRadius: theme.radius.md,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  cellLabel: {
    fontSize: 9,
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
  emojiCell: {
    width: '16%',
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.card,
    borderRadius: theme.radius.md,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  emojiCellSelected: {
    borderColor: theme.colors.accent,
    backgroundColor: theme.colors.accent,
    opacity: 0.2,
  },
  emoji: {
    fontSize: 28,
  },
}));
