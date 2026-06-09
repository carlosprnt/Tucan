import '@/theme/unistyles';

import { Stack } from 'expo-router';
import { View } from 'react-native';

import { AppBar } from '@/components/AppBar';

export default function AppLayout() {
  return (
    <View style={{ flex: 1 }}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="settings" options={{ presentation: 'modal' }} />
        <Stack.Screen name="habit/new" options={{ presentation: 'modal' }} />
        <Stack.Screen
          name="habit/[id]"
          options={{ presentation: 'transparentModal', gestureEnabled: false, animation: 'none' }}
        />
      </Stack>
      <AppBar />
    </View>
  );
}
