import { observable, type Observable } from '@legendapp/state';

import { todayKey } from '@/lib/date';
import { uuidv4 } from '@/lib/id';
import type { Tables } from '@/types/database';

import { requireUserId } from './auth';
import { customSynced } from './sync';

export type Habit = Tables<'habits'>;

/** All habit rows for the signed-in user, keyed by id (RLS scopes the read). */
export const habits$ = observable(
  customSynced({
    collection: 'habits',
    realtime: true,
    persist: { name: 'habits', retrySync: true },
    retry: { infinite: true },
  }),
);

/** Visible habits: not deleted, not archived, ordered by sort_order. */
export function listHabits(): Habit[] {
  const all = habits$.get();
  return (Object.values(all) as (Habit | undefined)[])
    .filter((h): h is Habit => !!h && !h.deleted && !h.archived_at)
    .sort(
      (a, b) =>
        a.sort_order - b.sort_order || a.created_at.localeCompare(b.created_at),
    );
}

export function getHabit(id: string): Habit | undefined {
  return habits$[id].get();
}

export interface NewHabitInput {
  name: string;
  description?: string | null;
  icon?: string | null;
  color?: string | null;
  start_date?: string;
}

/** Optimistically create a habit (synced in the background). Returns its id. */
export function createHabit(input: NewHabitInput): string {
  const id = uuidv4();
  const now = new Date().toISOString();
  const row: Habit = {
    id,
    user_id: requireUserId(),
    name: input.name,
    description: input.description ?? null,
    icon: input.icon ?? null,
    color: input.color ?? null,
    start_date: input.start_date ?? todayKey(),
    sort_order: listHabits().length,
    archived_at: null,
    created_at: now,
    updated_at: now,
    deleted: false,
  };
  habits$[id].set(row);
  return id;
}

export type HabitPatch = Partial<
  Pick<Habit, 'name' | 'description' | 'icon' | 'color' | 'start_date' | 'sort_order'>
>;

export function updateHabit(id: string, patch: HabitPatch): void {
  (habits$[id] as Observable<Habit>).assign(patch);
}

/** Soft archive: keeps history, hides from the active list. */
export function archiveHabit(id: string): void {
  habits$[id].archived_at.set(new Date().toISOString());
}

/** Soft delete (tombstone) — syncs as deleted=true. */
export function deleteHabit(id: string): void {
  habits$[id].deleted.set(true);
}

/** Persist a manual reorder of the visible habits. */
export function reorderHabits(orderedIds: string[]): void {
  orderedIds.forEach((id, index) => {
    habits$[id].sort_order.set(index);
  });
}
