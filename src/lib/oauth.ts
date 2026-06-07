import { GoogleSignin } from '@react-native-google-signin/google-signin';
import * as AppleAuthentication from 'expo-apple-authentication';
import { Platform } from 'react-native';

import { supabase } from './supabase';

/**
 * Native id-token sign-in for Supabase.
 *
 * Both providers return a native identity token that we hand to
 * `supabase.auth.signInWithIdToken` — no browser redirect, no PKCE dance.
 * Requires a custom dev build (these are native modules; Expo Go can't run them).
 */

const googleIosClientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;
const googleWebClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;

let googleConfigured = false;
function ensureGoogleConfigured(): void {
  if (googleConfigured) return;
  GoogleSignin.configure({
    iosClientId: googleIosClientId,
    // webClientId is the audience Supabase validates the id token against.
    webClientId: googleWebClientId,
  });
  googleConfigured = true;
}

/** Returns true if the user cancelled, false-y handled by caller. */
export async function signInWithGoogle(): Promise<void> {
  ensureGoogleConfigured();
  await GoogleSignin.hasPlayServices();
  const response = await GoogleSignin.signIn();
  if (response.type !== 'success') return; // user cancelled
  const idToken = response.data.idToken;
  if (!idToken) throw new Error('Google did not return an identity token');
  const { error } = await supabase.auth.signInWithIdToken({
    provider: 'google',
    token: idToken,
  });
  if (error) throw error;
}

export async function isAppleAuthAvailable(): Promise<boolean> {
  return Platform.OS === 'ios' && (await AppleAuthentication.isAvailableAsync());
}

export async function signInWithApple(): Promise<void> {
  const credential = await AppleAuthentication.signInAsync({
    requestedScopes: [
      AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
      AppleAuthentication.AppleAuthenticationScope.EMAIL,
    ],
  });
  const idToken = credential.identityToken;
  if (!idToken) throw new Error('Apple did not return an identity token');
  const { error } = await supabase.auth.signInWithIdToken({
    provider: 'apple',
    token: idToken,
  });
  if (error) throw error;
}
