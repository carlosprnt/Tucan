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
 * Home screen view state, shared with the global app bar so its right-hand
 * button can toggle between the list and the overview.
 */
export const homeUI$ = observable<{ overview: boolean }>({
  overview: false,
});
