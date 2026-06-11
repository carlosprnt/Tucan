import { observable, type Observable } from '@legendapp/state';

import { PREVIEW } from '@/lib/preview';
import type { Tables } from '@/types/database';

import { getUserId } from './auth';
import { admin$ } from './demo';
import { customSynced } from './sync';

export type Profile = Tables<'profiles'>;
export type ThemePref = 'light' | 'dark' | 'auto';

/** Profiles keyed by id; in practice only the current user's row is present. */
export const profiles$ = observable<Record<string, Profile>>(
  PREVIEW
    ? {}
    : (customSynced({
        collection: 'profiles',
        realtime: true,
        persist: { name: 'profiles', retrySync: true },
        retry: { infinite: true },
      }) as unknown as Record<string, Profile>),
);

export function currentProfile(): Profile | undefined {
  const id = getUserId();
  return id ? profiles$[id].get() : undefined;
}

/**
 * Whether Pro features are unlocked. Respects the admin's local Pro override
 * (for previewing Pro before the paywall exists); otherwise the real profile.
 */
export function isPremium(): boolean {
  const override = admin$.proOverride.get();
  if (override != null) return override;
  return currentProfile()?.is_premium ?? false;
}

export type ProfilePatch = Partial<
  Pick<
    Profile,
    'display_name' | 'theme_pref' | 'reminder_enabled' | 'reminder_time' | 'is_premium'
  >
>;

export function updateProfile(patch: ProfilePatch): void {
  const id = getUserId();
  if (!id) return;
  (profiles$[id] as Observable<Profile>).assign({
    ...patch,
    updated_at: new Date().toISOString(),
  });
}
