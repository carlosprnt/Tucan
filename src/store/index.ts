// Side-effecting sync configuration (persist plugin + shared Supabase config).
import './sync';

import { syncState } from '@legendapp/state';
import type { Session } from '@supabase/supabase-js';

import { addDays, todayKey } from '@/lib/date';
import { uuidv4 } from '@/lib/id';
import { PREVIEW, PREVIEW_USER_ID } from '@/lib/preview';
import { supabase } from '@/lib/supabase';

import { auth$, endSession, initAuth } from './auth';
import { completions$, type Completion } from './completions$';
import { admin$, exitDemo } from './demo';
import { habits$, type Habit } from './habits$';
import { profiles$, type Profile } from './profile$';
import { homeUI$ } from './ui';

export * from './auth';
export * from './demo';
export * from './habits$';
export * from './completions$';
export * from './insights';
export * from './profile$';
export * from './subscription';
export * from './ui';

/** Start the store: wire auth so sync can begin once a session exists. */
export function initStore(): void {
  if (PREVIEW) {
    seedPreview();
    return;
  }
  initAuth();

  // When a user signs in AFTER the app is already running (sign-out → sign-in,
  // or switching account), force a fresh pull of every collection. Sign-out
  // resets the local caches, which can leave the synced observables "loaded
  // empty" so they don't re-fetch on their own. The very first session on cold
  // start is skipped — the observables' natural lazy load already pulls it, and
  // forcing here would double-fetch and make the home flicker on launch.
  let lastUserId: string | null = null;
  auth$.session.onChange(({ value }) => {
    const uid = value?.user?.id ?? null;
    // During the initial hydration the synced observables lazy-load on first
    // access, so don't force a pull. `initializing` is still true while the
    // restored session lands; it's false by the time a real in-session sign-in
    // happens (incl. signing in from a logged-out cold start). Keying off it —
    // instead of "skip the first change" — fixes the case where the app opens
    // logged out and the very first change IS the sign-in.
    if (auth$.initializing.peek()) {
      lastUserId = uid;
      return;
    }
    if (uid && uid !== lastUserId) {
      void syncState(habits$).sync();
      void syncState(completions$).sync();
      void syncState(profiles$).sync();
    }
    lastUserId = uid;
  });
}

/** True once the local (MMKV) caches have hydrated — gate empty states on this. */
export function isStoreHydrated(): boolean {
  if (PREVIEW) return true;
  return (
    syncState(habits$).isPersistLoaded.get() &&
    syncState(completions$).isPersistLoaded.get()
  );
}

/**
 * True once we can trust the habit list is complete: the local cache has loaded
 * AND the first remote pull has resolved. After a fresh login the cache is empty
 * but the server may have habits, so we keep showing the skeleton (not the empty
 * state) until the pull lands. Read inside an `observer` so it stays reactive.
 */
export function isHabitsReady(): boolean {
  if (PREVIEW) return true;
  const s = syncState(habits$);
  return s.isPersistLoaded.get() && s.isLoaded.get();
}

/** Surfaces the first sync error across the core collections, if any. */
export function storeSyncError(): Error | undefined {
  if (PREVIEW) return undefined;
  return (
    syncState(habits$).error.get() ?? syncState(completions$).error.get() ?? undefined
  );
}

/**
 * Sign out AND clear the local cache so the next user can't see the previous
 * account's habits/completions (RLS protects the server; this protects the device).
 */
export async function signOut(): Promise<void> {
  if (PREVIEW) return; // no real session in preview
  exitDemo(); // never leave demo state for the next account
  admin$.proOverride.set(null); // clear the admin Pro override on this device
  homeUI$.booted.set(false); // replay the skeleton + bar entrance on next login
  homeUI$.overview.set(false);
  await endSession();
  await Promise.all([
    syncState(habits$).reset(),
    syncState(completions$).reset(),
    syncState(profiles$).reset(),
  ]);
}

/**
 * Permanently delete the account and ALL its data. The `delete_account` RPC
 * removes the auth user; every table cascades from it. Then we clear the local
 * session/caches like a sign-out.
 */
export async function deleteAccount(): Promise<void> {
  if (PREVIEW) return;
  const { error } = await supabase.rpc('delete_account');
  if (error) throw error;
  await signOut();
}

// ---------------------------------------------------------------------------
// Preview seed (dev only)
// ---------------------------------------------------------------------------

function seedPreview(): void {
  // Fake an authenticated session so the gate passes and user-id helpers work.
  auth$.session.set({
    user: { id: PREVIEW_USER_ID, email: 'preview@tucan.app' },
  } as unknown as Session);
  auth$.initializing.set(false);

  if (Object.keys(habits$.peek()).length > 0) return; // already seeded

  const now = new Date().toISOString();
  const today = todayKey();

  const ALL = 0b1111111;
  const WEEKDAYS = 0b0011111; // Mon-Fri

  const defs: {
    name: string;
    icon: string;
    color: string | null;
    days: number; // history length
    p: number; // completion probability
    activeDays: number;
  }[] = [
    { name: 'Drink water', icon: 'drop.fill', color: null, days: 64, p: 0.86, activeDays: ALL },
    { name: 'Exercise', icon: 'figure.run', color: null, days: 96, p: 0.5, activeDays: WEEKDAYS },
    { name: 'Read', icon: 'book.fill', color: null, days: 130, p: 0.72, activeDays: ALL },
    { name: 'Meditate', icon: 'brain.head.profile', color: null, days: 220, p: 0.6, activeDays: ALL },
    { name: 'Sleep early', icon: 'moon.fill', color: null, days: 28, p: 0.45, activeDays: ALL },
  ];

  defs.forEach((d, idx) => {
    const id = uuidv4();
    const startDate = addDays(today, -d.days);
    const habit: Habit = {
      id,
      user_id: PREVIEW_USER_ID,
      name: d.name,
      description: null,
      icon: d.icon,
      color: d.color,
      start_date: startDate,
      active_days: d.activeDays,
      reminder_enabled: false,
      reminder_time: null,
      sort_order: idx,
      archived_at: null,
      created_at: now,
      updated_at: now,
      deleted: false,
    };
    habits$[id].set(habit);

    for (let offset = d.days; offset >= 0; offset--) {
      // skip today for a couple of habits so "mark today" has something to do
      if (offset === 0 && idx % 2 === 1) continue;
      if (Math.random() < d.p) {
        const cid = uuidv4();
        const date = addDays(today, -offset);
        const completion: Completion = {
          id: cid,
          habit_id: id,
          user_id: PREVIEW_USER_ID,
          date,
          created_at: now,
          updated_at: now,
          deleted: false,
        };
        completions$[cid].set(completion);
      }
    }
  });

  const profile: Profile = {
    id: PREVIEW_USER_ID,
    display_name: 'Preview',
    theme_pref: 'auto',
    reminder_enabled: false,
    reminder_time: null,
    is_premium: true, // unlock colors so the full design is visible
    created_at: now,
    updated_at: now,
    deleted: false,
  };
  profiles$[PREVIEW_USER_ID].set(profile);
}
