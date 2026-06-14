import { addDays, ALL_DAYS, daysBetween, isActiveDay, todayKey, type DateKey } from './date';

/**
 * Real states for a dot, plus `empty` for cells outside a habit's life
 * (before start, or on a weekday the habit isn't active).
 * - done:   completed that day
 * - today:  today, still unmarked (outline / stroke, no fill)
 * - missed: a past active day (>= start) with no completion (solid gray)
 * - future: a day after today (ghost / dotted, never tappable)
 * - empty:  before start, or an inactive weekday
 */
export type DotState = 'done' | 'today' | 'missed' | 'future' | 'empty';

/** States for the last `days` days ending today (used by the card mini-grid). */
/**
 * A dense strip of the most recent ACTIVE days (skipping inactive weekdays and
 * anything before the habit started) so the card grid is never pocked with blank
 * cells. A brand-new habit with fewer real days than the grid holds is padded on
 * the right with `future` ghost dots, so the grid always reads as full.
 */
export function buildRecentStates(opts: {
  completed: Set<DateKey>;
  startDate: DateKey;
  days: number;
  today?: DateKey;
  activeDays?: number;
}): DotState[] {
  const today = opts.today ?? todayKey();
  const activeDays = opts.activeDays ?? ALL_DAYS;
  const states: DotState[] = [];

  // Walk backwards from today, keeping only active days within the habit's life.
  let key = today;
  while (states.length < opts.days && daysBetween(opts.startDate, key) >= 0) {
    if (isActiveDay(activeDays, key)) {
      states.push(opts.completed.has(key) ? 'done' : key === today ? 'today' : 'missed');
    }
    key = addDays(key, -1);
  }
  states.reverse(); // oldest → newest

  // Pad a young habit's remaining cells with ghost dots — never leave them blank.
  while (states.length < opts.days) states.push('future');
  return states;
}

/** States for a single calendar month grid (used by the detail Month view). */
export function buildMonthStates(opts: {
  completed: Set<DateKey>;
  startDate: DateKey;
  year: number;
  month: number; // 0-11
  today?: DateKey;
  activeDays?: number;
}): DotState[] {
  const today = opts.today ?? todayKey();
  const activeDays = opts.activeDays ?? ALL_DAYS;
  const daysInMonth = new Date(opts.year, opts.month + 1, 0).getDate();
  const states: DotState[] = [];
  for (let d = 1; d <= daysInMonth; d++) {
    const key = `${opts.year}-${String(opts.month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    if (daysBetween(today, key) > 0) states.push('future');
    else if (daysBetween(opts.startDate, key) < 0 || !isActiveDay(activeDays, key)) states.push('empty');
    else if (opts.completed.has(key)) states.push('done');
    else if (key === today) states.push('today');
    else states.push('missed');
  }
  return states;
}
