import '@/theme/unistyles';

import { use$ } from '@legendapp/state/react';
import { Stack } from 'expo-router';
import { View } from 'react-native';

import { AppBar } from '@/components/AppBar';
import { Paywall } from '@/components/Paywall';
import { hasPro } from '@/store';

export default function AppLayout() {
  // Pay-to-use after the free trial: with no access the paywall replaces the
  // whole app (hard gate). hasPro() = trial active, subscribed, admin, or preview.
  const locked = use$(() => !hasPro());
  if (locked) {
    return (
      <View style={{ flex: 1 }}>
        <Paywall />
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="settings" options={{ presentation: 'modal' }} />
        <Stack.Screen name="habit/new" options={{ presentation: 'modal' }} />
        <Stack.Screen name="habit/[id]" options={{ presentation: 'modal' }} />
        <Stack.Screen name="paywall" options={{ presentation: 'modal' }} />
      </Stack>
      <AppBar />
    </View>
  );
}
