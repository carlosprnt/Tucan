import { todayKey, weekdayIndex } from '@/lib/date';

import { completedDates, statsForHabit } from './completions$';
import { listHabits } from './habits$';

const WEEKDAYS = [
  'Mondays',
  'Tuesdays',
  'Wednesdays',
  'Thursdays',
  'Fridays',
  'Saturdays',
  'Sundays',
];

/** Completions across all visible habits in the current calendar month. */
export function doneThisMonth(): number {
  const month = todayKey().slice(0, 7);
  let count = 0;
  for (const h of listHabits()) {
    for (const d of completedDates(h.id)) {
      if (d.slice(0, 7) === month) count++;
    }
  }
  return count;
}

/** The weekday you complete most across all habits, or null if nothing's done. */
export function strongestWeekday(): string | null {
  const counts = [0, 0, 0, 0, 0, 0, 0];
  let any = false;
  for (const h of listHabits()) {
    for (const d of completedDates(h.id)) {
      counts[weekdayIndex(d)]++;
      any = true;
    }
  }
  if (!any) return null;
  let best = 0;
  for (let i = 1; i < 7; i++) if (counts[i] > counts[best]) best = i;
  return WEEKDAYS[best];
}

/** The habit with the highest completion %, or null if none has any completion. */
export function mostConsistentHabit(): { name: string; percent: number } | null {
  let best: { name: string; percent: number } | null = null;
  for (const h of listHabits()) {
    const { total, percent } = statsForHabit(h.id, h.start_date, h.active_days);
    if (total === 0) continue; // a habit with nothing done isn't "consistent"
    if (!best || percent > best.percent) best = { name: h.name, percent };
  }
  return best;
}
