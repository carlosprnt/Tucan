import { useRouter } from 'expo-router';
import { SymbolView, type SFSymbol } from 'expo-symbols';
import { Pressable, View } from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';

import { haptics } from '@/lib/haptics';

// Minimal shape of the props expo-router's <Tabs tabBar={...}> passes through.
type TabBarProps = {
  state: { index: number; routes: { key: string; name: string }[] };
  navigation: { navigate: (name: string) => void };
};

const TAB_ICONS: Record<string, SFSymbol> = {
  index: 'square.grid.2x2.fill',
  settings: 'gearshape.fill',
};

/** Floating 3-position bar: Today · + (create) · Global. The + is an action. */
export function FloatingTabBar({ state, navigation }: TabBarProps) {
  const { theme, rt } = useUnistyles();
  const router = useRouter();
  const activeName = state.routes[state.index]?.name;

  return (
    <View
      pointerEvents="box-none"
      style={[styles.wrap, { paddingBottom: rt.insets.bottom + theme.space.sm }]}>
      <View style={styles.bar}>
        <TabButton
          symbol={TAB_ICONS.index}
          label="Today"
          active={activeName === 'index'}
          onPress={() => {
            haptics.selection();
            navigation.navigate('index');
          }}
        />

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Create habit"
          style={({ pressed }) => [styles.fab, pressed && styles.pressed]}
          onPress={() => {
            haptics.light();
            router.push('/habit/new');
          }}>
          <SymbolView
            name="plus"
            size={26}
            weight="bold"
            tintColor={theme.colors.canvas}
          />
        </Pressable>

        <TabButton
          symbol={TAB_ICONS.settings}
          label="Settings"
          active={activeName === 'settings'}
          onPress={() => {
            haptics.selection();
            navigation.navigate('settings');
          }}
        />
      </View>
    </View>
  );
}

function TabButton({
  symbol,
  label,
  active,
  onPress,
}: {
  symbol: SFSymbol;
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  const { theme } = useUnistyles();
  return (
    <Pressable
      hitSlop={8}
      onPress={onPress}
      accessibilityRole="tab"
      accessibilityLabel={label}
      accessibilityState={{ selected: active }}
      style={({ pressed }) => [styles.tab, pressed && styles.pressed]}>
      <SymbolView
        name={symbol}
        size={26}
        tintColor={active ? theme.colors.ink : theme.colors.textMuted}
      />
    </Pressable>
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
    gap: theme.space.xl,
    paddingHorizontal: theme.space.xl,
    height: 64,
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
  tab: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fab: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: theme.colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.6,
  },
}));
