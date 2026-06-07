import { use$ } from '@legendapp/state/react';
import { Pressable, Text, View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

import { auth$, signOut } from '@/store';

// Placeholder home — becomes the "Today" tab screen in the next step.
// For now it confirms the auth round-trip end to end.
export default function Home() {
  const email = use$(() => auth$.session.get()?.user.email ?? '');

  return (
    <View style={styles.container}>
      <View style={styles.center}>
        <Text style={styles.brand}>Tucan</Text>
        <Text style={styles.muted}>Signed in as {email}</Text>
      </View>
      <Pressable
        style={({ pressed }) => [styles.signOut, pressed && styles.pressed]}
        onPress={() => signOut()}>
        <Text style={styles.signOutText}>Sign out</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create((theme, rt) => ({
  container: {
    flex: 1,
    backgroundColor: theme.colors.canvas,
    paddingHorizontal: theme.space.xl,
    paddingBottom: rt.insets.bottom + theme.space.xxl,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.space.sm,
  },
  brand: {
    fontSize: theme.font.display,
    fontWeight: theme.weight.bold,
    letterSpacing: -1,
    color: theme.colors.textPrimary,
  },
  muted: {
    fontSize: theme.font.body,
    color: theme.colors.textSecondary,
  },
  signOut: {
    height: 52,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.separator,
    alignItems: 'center',
    justifyContent: 'center',
  },
  signOutText: {
    fontSize: theme.font.body,
    fontWeight: theme.weight.semibold,
    color: theme.colors.textPrimary,
  },
  pressed: {
    opacity: 0.7,
  },
}));
