import { observable } from '@legendapp/state';

export type DetailViewMode = 'month' | 'accumulation';

/**
 * Ephemeral UI state shared between the habit detail screen and the global app
 * bar, so the single persistent bar can drive the detail's actions (mark today,
 * switch Month/All-time) while staying mounted across navigation.
 */
export const detailUI$ = observable<{
  habitId: string | null;
  mode: DetailViewMode;
}>({
  habitId: null,
  mode: 'month',
});

/**
 * Home screen view state, shared with the global app bar.
 * - `overview`: the right-hand bar button toggles list ↔ overview.
 * - `booted`: false until the dashboard has shown its first-entry skeleton and
 *   revealed real content. Drives the skeleton AND the bar's entrance from one
 *   narrow boolean, so the bar never re-renders on habit/sync changes. Reset to
 *   false on sign-out so the next login replays the skeleton + entrance.
 */
export const homeUI$ = observable<{ overview: boolean; booted: boolean }>({
  overview: false,
  booted: false,
});
