import { observable, type Observable } from '@legendapp/state';

import { ALL_DAYS, todayKey } from '@/lib/date';
import { uuidv4 } from '@/lib/id';
import { PREVIEW } from '@/lib/preview';
import type { Tables } from '@/types/database';

import { getUserId } from './auth';
import { customSynced } from './sync';

export type Habit = Tables<'habits'>;

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
  active_days?: number;
}

/** Optimistically create a habit (synced in the background). Returns its id, or '' if signed out. */
export function createHabit(input: NewHabitInput): string {
  const userId = getUserId();
  if (!userId) return '';
  const id = uuidv4();
  const now = new Date().toISOString();
  const row: Habit = {
    id,
    user_id: userId,
    name: input.name,
    description: input.description ?? null,
    icon: input.icon ?? null,
    color: input.color ?? null,
    start_date: input.start_date ?? todayKey(),
    active_days: input.active_days ?? ALL_DAYS,
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
  Pick<
    Habit,
    'name' | 'description' | 'icon' | 'color' | 'start_date' | 'sort_order' | 'active_days'
  >
>;

export function updateHabit(id: string, patch: HabitPatch): void {
  (habits$[id] as Observable<Habit>).assign({
    ...patch,
    updated_at: new Date().toISOString(),
  });
}

/** Soft archive: keeps history, hides from the active list. */
export function archiveHabit(id: string): void {
  const now = new Date().toISOString();
  (habits$[id] as Observable<Habit>).assign({ archived_at: now, updated_at: now });
}

/** Soft delete (tombstone) — syncs as deleted=true. */
export function deleteHabit(id: string): void {
  const now = new Date().toISOString();
  (habits$[id] as Observable<Habit>).assign({ deleted: true, updated_at: now });
}

/** Persist a manual reorder of the visible habits. */
export function reorderHabits(orderedIds: string[]): void {
  const now = new Date().toISOString();
  orderedIds.forEach((id, index) => {
    (habits$[id] as Observable<Habit>).assign({ sort_order: index, updated_at: now });
  });
}
