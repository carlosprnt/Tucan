import { observablePersistMMKV } from '@legendapp/state/persist-plugins/mmkv';
import { configureObservableSync, configureSynced } from '@legendapp/state/sync';
import { syncedSupabase } from '@legendapp/state/sync-plugins/supabase';

import { uuidv4 } from '@/lib/id';
import { supabase } from '@/lib/supabase';

// Persist every synced observable to MMKV by default (offline-first cache).
configureObservableSync({
  persist: {
    plugin: observablePersistMMKV({ id: 'tucan-store' }),
  },
});

/**
 * Shared Supabase sync config for all collections.
 *
 * - We deliberately do a FULL pull on each activation (no `changesSince`): the
 *   per-user data is tiny, and incremental "last-sync" mode is fragile across
 *   sign-out/sign-in — a surviving `lastSync` makes the pull skip existing rows,
 *   so data already in Supabase never re-appears after re-login. A full pull is
 *   cheap here and always reflects the server's current state (incl. tombstones).
 * - `fieldCreatedAt` lets the plugin tell a CREATE (no created_at yet) from an
 *   UPDATE; `fieldUpdatedAt` drives realtime conflict resolution; `fieldDeleted`
 *   replays soft-delete tombstones.
 * - `generateId` creates row ids locally so optimistic writes work fully offline.
 */
export const customSynced = configureSynced(syncedSupabase, {
  supabase,
  generateId: uuidv4,
  fieldCreatedAt: 'created_at',
  fieldUpdatedAt: 'updated_at',
  fieldDeleted: 'deleted',
  // Surface sync failures to the log (users only ever see friendly UI copy).
  onError: (error: unknown) => {
    // eslint-disable-next-line no-console
    console.error('[Tucan] sync error:', error);
  },
});
