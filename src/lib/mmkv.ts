import { createMMKV } from 'react-native-mmkv';

/**
 * Single native key/value store for the whole app.
 *
 * - Backs the Supabase auth session (see `supabase.ts`).
 * - Backs Legend-State persistence (see `store/sync.ts`).
 *
 * Later (widget step) we set an iOS App Group in Info.plist; MMKV then uses the
 * shared App Group directory automatically (path left undefined), so the
 * WidgetKit extension can read the same cache offline.
 */
export const storage = createMMKV({ id: 'tucan' });
