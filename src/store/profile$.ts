import { observable, type Observable } from '@legendapp/state';

import type { Tables } from '@/types/database';

import { getUserId } from './auth';
import { customSynced } from './sync';

export type Profile = Tables<'profiles'>;
export type ThemePref = 'light' | 'dark' | 'auto';

/** Profiles keyed by id; in practice only the current user's row is present. */
export const profiles$ = observable(
  customSynced({
    collection: 'profiles',
    realtime: true,
    persist: { name: 'profiles', retrySync: true },
    retry: { infinite: true },
  }),
);

export function currentProfile(): Profile | undefined {
  const id = getUserId();
  return id ? profiles$[id].get() : undefined;
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
