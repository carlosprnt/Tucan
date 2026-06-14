import '@/theme/unistyles'; // configure Unistyles before any StyleSheet.create runs

import { use$ } from '@legendapp/state/react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StyleSheet } from 'react-native-unistyles';

import { rescheduleAllReminders } from '@/lib/notifications';
import { applyThemePref } from '@/lib/theme-control';
import { initWidgets } from '@/lib/widget';
import {
  auth$,
  currentProfile,
  initStore,
  listHabits,
  syncPurchasesUser,
  type ThemePref,
} from '@/store';

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <StatusBar style="auto" />
      <RootNavigator />
    </GestureHandlerRootView>
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
  // A signature that changes whenever any reminder-relevant value changes:
  // the global daily reminder, or any habit's reminder/active-days/name.
  const reminderKey = use$(() => {
    const profile = currentProfile();
    const habits = listHabits();
    return JSON.stringify({
      g: [profile?.reminder_enabled ?? false, profile?.reminder_time ?? null],
      h: habits.map((h) => [h.name, h.reminder_enabled, h.reminder_time, h.active_days]),
    });
  });

  useEffect(() => {
    initStore();
    initWidgets(); // iOS widgets: push data + reconcile widget toggles (no-op elsewhere)
  }, []);

  // Tie RevenueCat to the signed-in user (and load prices) / reset on sign-out.
  useEffect(() => {
    void syncPurchasesUser(session?.user?.id ?? null);
  }, [session]);

  // Keep the runtime theme in sync with the user's saved preference.
  useEffect(() => {
    applyThemePref(themePref);
  }, [themePref]);

  // Re-apply the global + per-habit reminders whenever any of them changes.
  useEffect(() => {
    const profile = currentProfile();
    const habits = listHabits().map((h) => ({
      name: h.name,
      reminderEnabled: h.reminder_enabled,
      reminderTime: h.reminder_time,
      activeDays: h.active_days,
    }));
    void rescheduleAllReminders(
      { enabled: profile?.reminder_enabled ?? false, time: profile?.reminder_time ?? null },
      habits,
    );
  }, [reminderKey]);

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
