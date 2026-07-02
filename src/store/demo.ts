import { observable } from '@legendapp/state';

import { addDays, ALL_DAYS, todayKey } from '@/lib/date';
import { storage } from '@/lib/mmkv';

import { auth$ } from './auth';
import type { Completion } from './completions$';
import type { Habit } from './habits$';

/** Only this account sees the admin demo controls in Settings. */
export const ADMIN_EMAIL = 'carlosprnt@gmail.com';

export function isAdmin(): boolean {
  return (auth$.session.get()?.user?.email ?? '').toLowerCase() === ADMIN_EMAIL;
}

/**
 * Comped accounts: Pro forever, never hit the paywall. Add emails here (lowercase).
 * Client-side grant — fine for personal comps; for anything revocable/at scale,
 * prefer a RevenueCat promotional entitlement instead.
 */
export const LIFETIME_PRO_EMAILS = ['carlosprnt@gmail.com', 'pchicoza@gmail.com'];

export function isLifetimePro(): boolean {
  const email = (auth$.session.get()?.user?.email ?? '').toLowerCase();
  return LIFETIME_PRO_EMAILS.some((e) => e.toLowerCase() === email);
}

// ---------------------------------------------------------------------------
// Admin-only "force Pro" override. Persisted locally (MMKV), NEVER synced to
// Supabase — it's a dev switch to preview Pro features before the paywall.
// null = follow the real profile; true/false = override.
// ---------------------------------------------------------------------------

const PRO_KEY = 'admin.proOverride';
const storedPro = storage.getString(PRO_KEY);

export const admin$ = observable<{ proOverride: boolean | null }>({
  proOverride: storedPro === 'true' ? true : storedPro === 'false' ? false : null,
});

admin$.proOverride.onChange(({ value }) => {
  if (value == null) storage.remove(PRO_KEY);
  else storage.set(PRO_KEY, value ? 'true' : 'false');
});

export function setProOverride(value: boolean): void {
  admin$.proOverride.set(value);
}

// ---------------------------------------------------------------------------
// Demo mode — an in-memory LOCAL overlay. While a preset is active the store's
// read/write helpers use these observables instead of the synced ones, so the
// real Supabase account is never read or written. Exiting restores it untouched.
// Ephemeral on purpose: an app restart drops back to the real account.
// ---------------------------------------------------------------------------

export const demoMode$ = observable<{ preset: string | null }>({ preset: null });
export const demoHabits$ = observable<Record<string, Habit>>({});
export const demoCompletions$ = observable<Record<string, Completion>>({});

export function inDemo(): boolean {
  return demoMode$.preset.get() != null;
}

interface DemoHabitSpec {
  name: string;
  icon: string;
  /** Days of history (start_date = today − days + 1). */
  days: number;
  /** How many of those days are marked done. */
  done: number;
}

export interface DemoPreset {
  id: string;
  label: string;
  description: string;
  habits: DemoHabitSpec[];
}

export const DEMO_PRESETS: DemoPreset[] = [
  { id: 'empty', label: 'Empty', description: 'No habits — the empty state', habits: [] },
  {
    id: 'varied',
    label: '7 habits — varied',
    description: '5/10 · 50/100 · 300/600 · 40/40 · 0/30 · 18/20 · 200/365',
    habits: [
      { name: 'Drink water', icon: 'drop.fill', days: 10, done: 5 },
      { name: 'Read', icon: 'book.fill', days: 100, done: 50 },
      { name: 'Exercise', icon: 'figure.run', days: 600, done: 300 },
      { name: 'Meditate', icon: 'brain.head.profile', days: 40, done: 40 },
      { name: 'Sleep early', icon: 'moon.fill', days: 30, done: 0 },
      { name: 'Stretch', icon: 'heart.fill', days: 20, done: 18 },
      { name: 'Journal', icon: 'pencil', days: 365, done: 200 },
    ],
  },
];

/** Deterministic shuffle → exactly `done` distinct day offsets in [0, days). */
function pickDoneOffsets(days: number, done: number, seed: number): number[] {
  const arr = Array.from({ length: days }, (_, i) => i);
  let s = (seed + 1) * 9301 + 49297;
  for (let i = arr.length - 1; i > 0; i--) {
    s = (s * 9301 + 49297) % 233280;
    const j = Math.floor((s / 233280) * (i + 1));
    const tmp = arr[i];
    arr[i] = arr[j];
    arr[j] = tmp;
  }
  return arr.slice(0, Math.min(done, days));
}

function buildPreset(preset: DemoPreset): {
  habits: Record<string, Habit>;
  completions: Record<string, Completion>;
} {
  const habits: Record<string, Habit> = {};
  const completions: Record<string, Completion> = {};
  const userId = auth$.session.get()?.user?.id ?? 'demo-user';
  const now = new Date().toISOString();
  const today = todayKey();

  preset.habits.forEach((spec, idx) => {
    const id = `demo-h-${idx}`;
    const span = Math.max(1, spec.days);
    habits[id] = {
      id,
      user_id: userId,
      name: spec.name,
      description: null,
      icon: spec.icon,
      color: null,
      start_date: addDays(today, -(span - 1)),
      active_days: ALL_DAYS,
      reminder_enabled: false,
      reminder_time: null,
      sort_order: idx,
      archived_at: null,
      created_at: now,
      updated_at: now,
      deleted: false,
    };
    pickDoneOffsets(span, spec.done, idx).forEach((offset) => {
      const cid = `demo-c-${idx}-${offset}`;
      completions[cid] = {
        id: cid,
        habit_id: id,
        user_id: userId,
        date: addDays(today, -offset),
        created_at: now,
        updated_at: now,
        deleted: false,
      };
    });
  });

  return { habits, completions };
}

/** Enter a demo preset — swaps what every data screen shows for fake content. */
export function enterDemo(presetId: string): void {
  const preset = DEMO_PRESETS.find((p) => p.id === presetId);
  if (!preset) return;
  const { habits, completions } = buildPreset(preset);
  demoHabits$.set(habits);
  demoCompletions$.set(completions);
  demoMode$.preset.set(presetId);
}

/** Leave demo mode and restore the real account (its data was never touched). */
export function exitDemo(): void {
  demoMode$.preset.set(null);
  demoHabits$.set({});
  demoCompletions$.set({});
}
