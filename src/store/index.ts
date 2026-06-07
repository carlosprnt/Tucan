// Side-effecting sync configuration (persist plugin + shared Supabase config).
import './sync';

import { syncState } from '@legendapp/state';

import { endSession, initAuth } from './auth';
import { completions$ } from './completions$';
import { habits$ } from './habits$';
import { profiles$ } from './profile$';

export * from './auth';
export * from './habits$';
export * from './completions$';
export * from './profile$';

/** Start the store: wire auth so sync can begin once a session exists. */
export function initStore(): void {
  initAuth();
}

/** True once the local (MMKV) caches have hydrated — gate empty states on this. */
export function isStoreHydrated(): boolean {
  return (
    syncState(habits$).isPersistLoaded.get() &&
    syncState(completions$).isPersistLoaded.get()
  );
}

/** Surfaces the first sync error across the core collections, if any. */
export function storeSyncError(): Error | undefined {
  return (
    syncState(habits$).error.get() ?? syncState(completions$).error.get() ?? undefined
  );
}

/**
 * Sign out AND clear the local cache so the next user can't see the previous
 * account's habits/completions (RLS protects the server; this protects the device).
 */
export async function signOut(): Promise<void> {
  await endSession();
  await Promise.all([
    syncState(habits$).reset(),
    syncState(completions$).reset(),
    syncState(profiles$).reset(),
  ]);
}
