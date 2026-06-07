import * as AppleAuthentication from 'expo-apple-authentication';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, Text, View } from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';

import { haptics } from '@/lib/haptics';
import { isAppleAuthAvailable, signInWithApple, signInWithGoogle } from '@/lib/oauth';

type Provider = 'google' | 'apple';

// Apple sign-in is gated until its Supabase provider is configured.
const APPLE_ENABLED = process.env.EXPO_PUBLIC_ENABLE_APPLE_AUTH === 'true';

export default function SignIn() {
  const { theme, rt } = useUnistyles();
  const [appleAvailable, setAppleAvailable] = useState(false);
  const [busy, setBusy] = useState<Provider | null>(null);

  useEffect(() => {
    if (!APPLE_ENABLED) return;
    isAppleAuthAvailable().then(setAppleAvailable);
  }, []);

  async function run(provider: Provider, fn: () => Promise<void>) {
    if (busy) return;
    haptics.light();
    setBusy(provider);
    try {
      await fn();
    } catch (e) {
      Alert.alert('Sign in failed', e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setBusy(null);
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.brand}>Tucan</Text>
        <Text style={styles.tagline}>Build habits, one dot at a time.</Text>
      </View>

      <View style={styles.actions}>
        {appleAvailable && (
          <AppleAuthentication.AppleAuthenticationButton
            buttonType={AppleAuthentication.AppleAuthenticationButtonType.CONTINUE}
            buttonStyle={
              rt.themeName === 'dark'
                ? AppleAuthentication.AppleAuthenticationButtonStyle.WHITE
                : AppleAuthentication.AppleAuthenticationButtonStyle.BLACK
            }
            cornerRadius={theme.radius.md}
            style={styles.appleButton}
            onPress={() => run('apple', signInWithApple)}
          />
        )}

        <Pressable
          style={({ pressed }) => [styles.googleButton, pressed && styles.pressed]}
          disabled={busy !== null}
          onPress={() => run('google', signInWithGoogle)}>
          {busy === 'google' ? (
            <ActivityIndicator color={theme.colors.card} />
          ) : (
            <Text style={styles.googleText}>Continue with Google</Text>
          )}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create((theme, rt) => ({
  container: {
    flex: 1,
    backgroundColor: theme.colors.canvas,
    paddingHorizontal: theme.space.xl,
    paddingTop: rt.insets.top + theme.space.xxxl,
    paddingBottom: rt.insets.bottom + theme.space.xxl,
    justifyContent: 'space-between',
  },
  header: {
    flex: 1,
    justifyContent: 'center',
    gap: theme.space.sm,
  },
  brand: {
    fontSize: theme.font.display,
    fontWeight: theme.weight.bold,
    letterSpacing: -1,
    color: theme.colors.textPrimary,
  },
  tagline: {
    fontSize: theme.font.body,
    color: theme.colors.textSecondary,
  },
  actions: {
    gap: theme.space.md,
  },
  appleButton: {
    height: 52,
    width: '100%',
  },
  googleButton: {
    height: 52,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  googleText: {
    fontSize: theme.font.body,
    fontWeight: theme.weight.semibold,
    color: theme.colors.card,
  },
  pressed: {
    opacity: 0.8,
  },
}));
