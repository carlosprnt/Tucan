import { addDays, daysBetween, todayKey, type DateKey } from './date';

/**
 * Three real states for a dot, plus `empty` for cells outside a habit's life.
 * - done:   completed that day
 * - missed: a past day (>= start) with no completion (solid gray)
 * - future: a day after today (ghost / dotted, never tappable)
 * - empty:  before the habit's start date (renders as nothing)
 */
export type DotState = 'done' | 'missed' | 'future' | 'empty';

/** States for the last `days` days ending today (used by the card mini-grid). */
export function buildRecentStates(opts: {
  completed: Set<DateKey>;
  startDate: DateKey;
  days: number;
  today?: DateKey;
}): DotState[] {
  const today = opts.today ?? todayKey();
  const first = addDays(today, -(opts.days - 1));
  const states: DotState[] = [];
  for (let i = 0; i < opts.days; i++) {
    const key = addDays(first, i);
    if (daysBetween(opts.startDate, key) < 0) states.push('empty');
    else if (opts.completed.has(key)) states.push('done');
    else states.push('missed');
  }
  return states;
}

/** States for a single calendar month grid (used by the detail Month view). */
export function buildMonthStates(opts: {
  completed: Set<DateKey>;
  startDate: DateKey;
  year: number;
  month: number; // 0-11
  today?: DateKey;
}): DotState[] {
  const today = opts.today ?? todayKey();
  const daysInMonth = new Date(opts.year, opts.month + 1, 0).getDate();
  const states: DotState[] = [];
  for (let d = 1; d <= daysInMonth; d++) {
    const key = `${opts.year}-${String(opts.month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    if (daysBetween(today, key) > 0) states.push('future');
    else if (daysBetween(opts.startDate, key) < 0) states.push('empty');
    else if (opts.completed.has(key)) states.push('done');
    else states.push('missed');
  }
  return states;
}
