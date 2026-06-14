import { ExtensionStorage } from '@bacons/apple-targets';
import { AppState, Platform } from 'react-native';

import { daysBetween, isActiveDay, todayKey } from '@/lib/date';
import { buildRecentStates, type DotState } from '@/lib/grid';
import { PREVIEW } from '@/lib/preview';
import {
  completedDates,
  completions$,
  habits$,
  isDone,
  listHabits,
  toggleCompletion,
  totalForHabit,
} from '@/store';

const APP_GROUP = 'group.com.carlosprnt.tucan';
const DATA_KEY = 'widgetData';
const PENDING_KEY = 'pendingToggles';
const GRID_DAYS = 30; // ~a month of checks for the grid widget

// Created lazily + defensively: a build without the native module (e.g. before
// the next rebuild that includes the widget target) must never crash.
let cached: ExtensionStorage | null | undefined;
function storage(): ExtensionStorage | null {
  if (Platform.OS !== 'ios') return null;
  if (cached !== undefined) return cached;
  try {
    cached = new ExtensionStorage(APP_GROUP);
  } catch {
    cached = null;
  }
  return cached;
}

function stateToInt(s: DotState): number {
  return s === 'done' ? 1 : s === 'missed' ? 0 : s === 'today' ? 2 : 3;
}

/** Build today's payload and push it to the widgets. */
export function syncWidgets(): void {
  const store = storage();
  if (!store || PREVIEW) return;
  try {
    const today = todayKey();
    const due = listHabits().filter(
      (h) => isActiveDay(h.active_days, today) && daysBetween(h.start_date, today) >= 0,
    );
    const habits = due.map((h) => {
      const completed = completedDates(h.id);
      const states = buildRecentStates({
        completed,
        startDate: h.start_date,
        days: GRID_DAYS,
        today,
        activeDays: h.active_days,
      }).map(stateToInt);
      // % over the days shown that are gradeable (done or missed, excl. today/future).
      const doneDays = states.filter((s) => s === 1).length;
      const missedDays = states.filter((s) => s === 0).length;
      const graded = doneDays + missedDays;
      const percent = graded > 0 ? Math.round((doneDays / graded) * 100) : 0;
      return {
        id: h.id,
        name: h.name,
        icon: h.icon ?? '',
        done: completed.has(today),
        total: totalForHabit(h.id),
        percent,
        states,
      };
    });
    const doneCount = habits.filter((x) => x.done).length;
    store.set(DATA_KEY, JSON.stringify({ date: today, habits, doneCount, dueCount: habits.length }));
    ExtensionStorage.reloadWidget();
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
