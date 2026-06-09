import { observable } from '@legendapp/state';

import {
  addDays,
  ALL_DAYS,
  daysBetween,
  isActiveDay,
  todayKey,
  type DateKey,
} from '@/lib/date';
import { uuidv4 } from '@/lib/id';
import { PREVIEW } from '@/lib/preview';
import type { Tables } from '@/types/database';

import { getUserId } from './auth';
import { customSynced } from './sync';

export type Completion = Tables<'completions'>;

/**
 * All completion rows for the signed-in user, keyed by id.
 * A completion counts as "done" when a row exists and `deleted` is false.
 */
export const completions$ = observable<Record<string, Completion>>(
  PREVIEW
    ? {}
    : (customSynced({
        collection: 'completions',
        realtime: true,
        persist: { name: 'completions', retrySync: true },
        retry: { infinite: true },
      }) as unknown as Record<string, Completion>),
);

function findCompletion(habitId: string, date: DateKey): Completion | undefined {
  const all = completions$.peek();
  return (Object.values(all) as (Completion | undefined)[]).find(
    (c): c is Completion => !!c && c.habit_id === habitId && c.date === date,
  );
}

export function isDone(habitId: string, date: DateKey): boolean {
  const c = findCompletion(habitId, date);
  return !!c && !c.deleted;
}

/**
 * Toggle a habit's completion for a local day. Optimistic + instant:
 * re-marking a previously un-marked day revives the existing row (so we never
 * violate the unique(habit_id, date) constraint); a fresh mark inserts a row.
 */
export function toggleCompletion(habitId: string, date: DateKey): void {
  const userId = getUserId();
  if (!userId) return; // no session — never throw from a press handler
  const existing = findCompletion(habitId, date);
  if (existing) {
    completions$[existing.id].deleted.set(!existing.deleted);
    completions$[existing.id].updated_at.set(new Date().toISOString());
    return;
  }
  const id = uuidv4();
  const now = new Date().toISOString();
  const row: Completion = {
    id,
    habit_id: habitId,
    user_id: userId,
    date,
    created_at: now,
    updated_at: now,
    deleted: false,
  };
  completions$[id].set(row);
}

/** Total completed days for a habit (the number that only ever goes up). */
export function totalForHabit(habitId: string): number {
  const all = completions$.get();
  return (Object.values(all) as (Completion | undefined)[]).filter(
    (c) => !!c && c.habit_id === habitId && !c.deleted,
  ).length;
}

/** Set of completed local-day keys for a habit (for rendering grids). */
export function completedDates(habitId: string): Set<DateKey> {
  const all = completions$.get();
  const dates = new Set<DateKey>();
  for (const c of Object.values(all) as (Completion | undefined)[]) {
    if (c && c.habit_id === habitId && !c.deleted) dates.add(c.date);
  }
  return dates;
}

export interface HabitStats {
  total: number;
  /** Active days elapsed from start through today (the % denominator). */
  days: number;
  /** done / (today − start_date + 1), 0–100, rounded. */
  percent: number;
}

/** Count of active weekdays from startDate through today (>= 1). */
function activeDaysElapsed(startDate: DateKey, activeDays: number): number {
  const span = Math.max(0, daysBetween(startDate, todayKey()));
  let count = 0;
  for (let i = 0; i <= span; i++) {
    if (isActiveDay(activeDays, addDays(startDate, i))) count++;
  }
  return Math.max(1, count);
}

export function statsForHabit(
  habitId: string,
  startDate: DateKey,
  activeDays: number = ALL_DAYS,
): HabitStats {
  const total = totalForHabit(habitId);
  const days = activeDaysElapsed(startDate, activeDays);
  const percent = Math.min(100, Math.round((total / days) * 100));
  return { total, days, percent };
}
