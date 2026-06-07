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
 * - `changesSince: 'last-sync'` + `fieldUpdatedAt`/`fieldDeleted` let the plugin
 *   pull only rows changed since the last sync and replay soft-delete tombstones.
 * - `generateId` creates row ids locally so optimistic writes work fully offline.
 */
export const customSynced = configureSynced(syncedSupabase, {
  supabase,
  generateId: uuidv4,
  changesSince: 'last-sync',
  fieldCreatedAt: 'created_at',
  fieldUpdatedAt: 'updated_at',
  fieldDeleted: 'deleted',
});
