import { observable, type Observable } from '@legendapp/state';

import { ALL_DAYS, todayKey } from '@/lib/date';
import { uuidv4 } from '@/lib/id';
import { PREVIEW } from '@/lib/preview';
import type { Tables } from '@/types/database';

import { getUserId } from './auth';
import { demoHabits$, inDemo } from './demo';
import { customSynced } from './sync';

export type Habit = Tables<'habits'>;

/** The observable backing habit rows: the demo overlay or the synced store. */
function habitsRoot(): Observable<Record<string, Habit>> {
  return (inDemo() ? demoHabits$ : habits$) as Observable<Record<string, Habit>>;
}

/** All habit rows for the signed-in user, keyed by id (RLS scopes the read). */
export const habits$ = observable<Record<string, Habit>>(
  PREVIEW
    ? {}
    : (customSynced({
        collection: 'habits',
        realtime: true,
        persist: { name: 'habits', retrySync: true },
        retry: { infinite: true },
      }) as unknown as Record<string, Habit>),
);

/** Visible habits: not deleted, not archived, ordered by sort_order. */
export function listHabits(): Habit[] {
  const all = habitsRoot().get() ?? {};
  return (Object.values(all) as (Habit | undefined)[])
    .filter((h): h is Habit => !!h && !h.deleted && !h.archived_at)
    .sort(
      (a, b) =>
        a.sort_order - b.sort_order ||
        // created_at may be briefly absent on a just-created row until the
        // insert response merges the DB value back in.
        (a.created_at ?? '').localeCompare(b.created_at ?? ''),
    );
}

export function getHabit(id: string): Habit | undefined {
  return habitsRoot()[id].get();
}

export interface NewHabitInput {
  name: string;
  description?: string | null;
  icon?: string | null;
  color?: string | null;
  start_date?: string;
  active_days?: number;
  reminder_enabled?: boolean;
  reminder_time?: string | null;
}

/** Optimistically create a habit (synced in the background). Returns its id, or '' if signed out. */
export function createHabit(input: NewHabitInput): string {
  const demo = inDemo();
  const userId = getUserId() ?? (demo ? 'demo-user' : null);
  if (!userId) return '';
  const id = uuidv4();
  const now = new Date().toISOString();
  // New habits appear at the top: use minimum sort_order - 1
  const existingHabits = listHabits();
  const minSortOrder = existingHabits.length > 0
    ? Math.min(...existingHabits.map((h) => h.sort_order))
    : 0;
  // NOTE: `created_at` is intentionally omitted. The sync plugin uses the
  // ABSENCE of created_at to tell a CREATE (insert) from an UPDATE (patch) —
  // setting it here makes new rows patch a non-existent row and never persist.
  // The database fills created_at via its default; the insert's response then
  // merges the real value back into the store.
  const row = {
    id,
    user_id: userId,
    name: input.name,
    description: input.description ?? null,
    icon: input.icon ?? null,
    color: input.color ?? null,
    start_date: input.start_date ?? todayKey(),
    active_days: input.active_days ?? ALL_DAYS,
    reminder_enabled: input.reminder_enabled ?? false,
    reminder_time: input.reminder_time ?? null,
    sort_order: minSortOrder - 1,
    archived_at: null,
    updated_at: now,
    deleted: false,
  } satisfies Omit<Habit, 'created_at'>;
  if (demo) {
    // Demo rows are local-only (never synced), so created_at is set directly.
    demoHabits$[id].set({ ...row, created_at: now } as Habit);
  } else {
    habits$[id].set(row as Habit);
  }
  return id;
}

export type HabitPatch = Partial<
  Pick<
    Habit,
    | 'name'
    | 'description'
    | 'icon'
    | 'color'
    | 'start_date'
    | 'sort_order'
    | 'active_days'
    | 'reminder_enabled'
    | 'reminder_time'
  >
>;

export function updateHabit(id: string, patch: HabitPatch): void {
  (habitsRoot()[id] as Observable<Habit>).assign({
    ...patch,
    updated_at: new Date().toISOString(),
  });
}

/** Soft archive: keeps history, hides from the active list. */
export function archiveHabit(id: string): void {
  const now = new Date().toISOString();
  (habitsRoot()[id] as Observable<Habit>).assign({ archived_at: now, updated_at: now });
}

/** Soft delete (tombstone) — syncs as deleted=true. */
export function deleteHabit(id: string): void {
  const now = new Date().toISOString();
  (habitsRoot()[id] as Observable<Habit>).assign({ deleted: true, updated_at: now });
}

/** Persist a manual reorder of the visible habits. */
export function reorderHabits(orderedIds: string[]): void {
  const now = new Date().toISOString();
  orderedIds.forEach((id, index) => {
    (habitsRoot()[id] as Observable<Habit>).assign({ sort_order: index, updated_at: now });
  });
}
