import type { ExtensionStorage as ExtensionStorageInstance } from '@bacons/apple-targets';
import { AppState, Platform } from 'react-native';

import { addDays, daysBetween, type DateKey, isActiveDay, todayKey } from '@/lib/date';
import { PREVIEW } from '@/lib/preview';
import {
  completedDates,
  completions$,
  habits$,
  isDone,
  listHabits,
  statsForHabit,
  toggleCompletion,
} from '@/store';

const APP_GROUP = 'group.com.carlosprnt.tucan';
const DATA_KEY = 'widgetData';
const PENDING_KEY = 'pendingToggles';
const GRID_DAYS = 98; // enough cells for the large habit-card widget

// Loaded lazily + defensively: keep `@bacons/apple-targets` off the startup
// import path, and a build without the native module must never crash.
let mod: typeof import('@bacons/apple-targets') | null | undefined;
function targets(): typeof import('@bacons/apple-targets') | null {
  if (mod !== undefined) return mod;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    mod = require('@bacons/apple-targets');
  } catch {
    mod = null;
  }
  return mod ?? null;
}

let cached: ExtensionStorageInstance | null | undefined;
function storage(): ExtensionStorageInstance | null {
  if (Platform.OS !== 'ios') return null;
  if (cached !== undefined) return cached;
  const m = targets();
  try {
    cached = m ? new m.ExtensionStorage(APP_GROUP) : null;
  } catch {
    cached = null;
  }
  return cached;
}

// Today-first grid for the widgets: index 0 is today (top-left), then past days
// (active days only, no future). 0 missed · 1 done · 2 today-unmarked.
function habitStates(
  completed: Set<DateKey>,
  startDate: DateKey,
  count: number,
  today: DateKey,
  activeDays: number,
): number[] {
  const out: number[] = [];
  let key: DateKey = today;
  while (out.length < count && daysBetween(startDate, key) >= 0) {
    if (isActiveDay(activeDays, key)) {
      if (key === today) out.push(completed.has(key) ? 1 : 2);
      else out.push(completed.has(key) ? 1 : 0);
    }
    key = addDays(key, -1);
  }
  return out;
}

/** Build today's payload and push it to the widgets. */
export function syncWidgets(): void {
  const store = storage();
  if (!store || PREVIEW) return;
  try {
    const today = todayKey();
    const all = listHabits();
    // Habits scheduled today (for the progress widget's done/due counts).
    const dueIds = new Set(
      all
        .filter((h) => isActiveDay(h.active_days, today) && daysBetween(h.start_date, today) >= 0)
        .map((h) => h.id),
    );
    // ALL habits go in the payload — single-habit widgets let the user pick one.
    const habits = all.map((h) => {
      const completed = completedDates(h.id);
      const stats = statsForHabit(h.id, h.start_date, h.active_days);
      const states = habitStates(completed, h.start_date, GRID_DAYS, today, h.active_days);
      return {
        id: h.id,
        name: h.name,
        icon: h.icon ?? '',
        done: completed.has(today),
        total: stats.total,
        days: stats.days,
        percent: stats.percent,
        states,
      };
    });
    const doneCount = habits.filter((h) => dueIds.has(h.id) && h.done).length;
    store.set(DATA_KEY, JSON.stringify({ date: today, habits, doneCount, dueCount: dueIds.size }));
    targets()?.ExtensionStorage.reloadWidget();
  } catch {
    // best-effort; widgets must never break the app
  }
}

/** Apply toggles made from a widget (App Intent), then sync them to Supabase. */
export function applyPendingWidgetToggles(): void {
  const store = storage();
  if (!store || PREVIEW) return;
  try {
    const raw = store.get(PENDING_KEY);
    if (raw) {
      const pending = JSON.parse(raw) as Record<string, boolean>;
      const today = todayKey();
      for (const [id, desired] of Object.entries(pending)) {
        if (isDone(id, today) !== desired) toggleCompletion(id, today);
      }
      store.remove(PENDING_KEY);
    }
  } catch {
    // ignore malformed pending data
  }
  syncWidgets();
}

let started = false;
/** Wire widget updates: refresh on data change + reconcile on app foreground. */
export function initWidgets(): void {
  if (started || Platform.OS !== 'ios' || PREVIEW) return;
  if (!storage()) return; // native module not in this build yet
  started = true;

  syncWidgets(); // initial push (may be empty until the store hydrates)

  // Reconcile widget toggles only once the store has data, so we don't apply a
  // pending toggle against an empty store and double it.
  let reconciledOnce = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const onData = () => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      if (!reconciledOnce) {
        reconciledOnce = true;
        applyPendingWidgetToggles();
      } else {
        syncWidgets();
      }
    }, 400);
  };
  habits$.onChange(onData);
  completions$.onChange(onData);

  // Returning to the app: apply anything toggled from the widget meanwhile.
  AppState.addEventListener('change', (s) => {
    if (s === 'active' && reconciledOnce) applyPendingWidgetToggles();
  });
}
