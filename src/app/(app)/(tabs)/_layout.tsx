import '@/theme/unistyles';

import { Tabs } from 'expo-router';

// The floating bar is rendered once at the (app) layout (see AppBar), so it can
// persist and morph across navigation. The built-in tab bar is hidden here.
export default function TabsLayout() {
  return (
    <Tabs screenOptions={{ headerShown: false }} tabBar={() => null}>
      <Tabs.Screen name="index" options={{ title: 'Habits' }} />
      <Tabs.Screen name="settings" options={{ title: 'Settings' }} />
    </Tabs>
  );
}
