// Configure Unistyles before any styled component mounts.
import '@/theme/unistyles';

import { use$ } from '@legendapp/state/react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

import { auth$, initStore } from '@/store';

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

  useEffect(() => {
    initStore();
  }, []);

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
