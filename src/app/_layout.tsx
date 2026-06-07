import { use$ } from '@legendapp/state/react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

import { rescheduleReminder } from '@/lib/notifications';
import { applyThemePref } from '@/lib/theme-control';
import { auth$, currentProfile, initStore, type ThemePref } from '@/store';

export default function RootLayout() {
  return (
    <>
      <StatusBar style="auto" />
      <RootNavigator />
    </>
  );
}

function RootNavigator() {
  const router = useRouter();
  const segments = useSegments();
  const initializing = use$(auth$.initializing);
  const session = use$(auth$.session);
  const themePref = use$(
    () => (currentProfile()?.theme_pref as ThemePref | undefined) ?? 'auto',
  );
  const reminderEnabled = use$(() => currentProfile()?.reminder_enabled ?? false);
  const reminderTime = use$(() => currentProfile()?.reminder_time ?? null);

  useEffect(() => {
    initStore();
  }, []);

  // Keep the runtime theme in sync with the user's saved preference.
  useEffect(() => {
    applyThemePref(themePref);
  }, [themePref]);

  // Re-apply the daily reminder whenever the saved preference changes.
  useEffect(() => {
    void rescheduleReminder(reminderEnabled, reminderTime);
  }, [reminderEnabled, reminderTime]);

  useEffect(() => {
    if (initializing) return;
    const inAuthGroup = segments[0] === '(auth)';
    if (!session && !inAuthGroup) {
      router.replace('/(auth)/sign-in');
    } else if (session && inAuthGroup) {
      router.replace('/');
    }
  }, [initializing, session, segments, router]);

  // Keep a blank canvas until the session is resolved to avoid a flash.
  if (initializing) return <View style={styles.canvas} />;

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(app)" />
    </Stack>
  );
}

const styles = StyleSheet.create((theme) => ({
  canvas: {
    flex: 1,
    backgroundColor: theme.colors.canvas,
  },
}));
