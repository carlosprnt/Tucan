import { Pressable, Text, View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

import { signOut } from '@/store';

// Placeholder — the aggregated year-heatmap view is built in a later step.
// Sign out lives here temporarily until the Settings screen exists.
export default function Global() {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Global</Text>
        <Text style={styles.subtitle}>Year heatmap coming soon.</Text>
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
    paddingHorizontal: theme.space.lg,
    paddingTop: rt.insets.top + theme.space.lg,
    paddingBottom: rt.insets.bottom + 96,
  },
  header: {
    flex: 1,
    gap: theme.space.xs,
  },
  title: {
    fontSize: theme.font.display,
    fontWeight: theme.weight.bold,
    letterSpacing: -1,
    color: theme.colors.textPrimary,
  },
  subtitle: {
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
