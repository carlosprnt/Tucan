import { observable } from '@legendapp/state';
import type { Session } from '@supabase/supabase-js';

import { supabase } from '@/lib/supabase';

/**
 * Auth state, mirrored from Supabase into an observable so the rest of the app
 * (and the offline store) can react to sign-in / sign-out.
 *
 * The app is gated on having a session, so the synced observables are only ever
 * observed once a user is signed in — Legend-State starts each sync lazily on
 * first access, which means sync naturally begins after login.
 */
export const auth$ = observable<{
  session: Session | null;
  initializing: boolean;
}>({
  session: null,
  initializing: true,
});

export function getUserId(): string | null {
  return auth$.session.get()?.user.id ?? null;
}

export function requireUserId(): string {
  const id = getUserId();
  if (!id) throw new Error('No authenticated user');
  return id;
}

let initialized = false;

/** Hydrate the session from storage and subscribe to auth changes. */
export function initAuth(): void {
  if (initialized) return;
  initialized = true;

  void supabase.auth.getSession().then(({ data }) => {
    auth$.session.set(data.session);
    auth$.initializing.set(false);
  });

  supabase.auth.onAuthStateChange((_event, session) => {
    auth$.session.set(session);
    auth$.initializing.set(false);
  });
}

/** Low-level: end the Supabase session. Prefer `signOut` from the store index,
 * which also clears the local cache to prevent cross-account data leakage. */
export async function endSession(): Promise<void> {
  await supabase.auth.signOut();
}
