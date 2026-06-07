import '@/theme/unistyles';

import { Stack } from 'expo-router';

export default function AppLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="habit/new" options={{ presentation: 'modal' }} />
      <Stack.Screen name="habit/[id]" />
      <Stack.Screen name="settings" />
    </Stack>
  );
}
