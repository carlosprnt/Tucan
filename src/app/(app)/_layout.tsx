import '@/theme/unistyles';

import { Stack } from 'expo-router';
import { View } from 'react-native';

import { AppBar } from '@/components/AppBar';

export default function AppLayout() {
  // Pay-to-use after the free trial, but the app stays browsable — individual
  // habit interactions open the paywall instead (see useProGate). Settings stay
  // reachable so the user can subscribe or manage their account.
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
