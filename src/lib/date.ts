/**
 * Date helpers — everything is keyed by a LOCAL calendar day (`YYYY-MM-DD`).
 *
 * A completion is "the day the user lived", computed in the device timezone,
 * never a UTC timestamp. This is the only reliable way to keep retroactive
 * marking and widgets correct across midnight and timezone changes.
 */

/** A local day key, e.g. "2026-06-06". */
export type DateKey = string;

/** Format a Date as a local-day key (uses the device timezone). */
export function toDateKey(date: Date): DateKey {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Today's local-day key. */
export function todayKey(now: Date = new Date()): DateKey {
  return toDateKey(now);
}

/** Parse a local-day key into a Date at local midnight. */
export function fromDateKey(key: DateKey): Date {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}

/** Return a new key offset by `days` (can be negative) from `key`. */
export function addDays(key: DateKey, days: number): DateKey {
  const date = fromDateKey(key);
  date.setDate(date.getDate() + days);
  return toDateKey(date);
}

/** Whole calendar days from `a` to `b` (b - a). Negative if b is before a. */
export function daysBetween(a: DateKey, b: DateKey): number {
  const MS_PER_DAY = 24 * 60 * 60 * 1000;
  const [ay, am, ad] = a.split('-').map(Number);
  const [by, bm, bd] = b.split('-').map(Number);
  // Compare in UTC so each day is exactly 24h, immune to local DST shifts.
  const diff = Date.UTC(by, bm - 1, bd) - Date.UTC(ay, am - 1, ad);
  return Math.round(diff / MS_PER_DAY);
}

/** True if `key` is strictly after today (the future is not tappable). */
export function isFuture(key: DateKey, now: Date = new Date()): boolean {
  return daysBetween(todayKey(now), key) > 0;
}

/**
 * Inclusive count of elapsed days from `startDate` through today, floored at 1.
 * This is the denominator of the completion percentage.
 */
export function elapsedDaysInclusive(
  startDate: DateKey,
  now: Date = new Date(),
): number {
  return Math.max(1, daysBetween(startDate, todayKey(now)) + 1);
}
