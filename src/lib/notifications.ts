import * as Notifications from 'expo-notifications';

// Show reminders as a banner even when the app is foregrounded.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

async function hasPermission(): Promise<boolean> {
  const { status } = await Notifications.getPermissionsAsync();
  return status === 'granted';
}

/** Prompt for notification permission (call on explicit user opt-in). */
export async function requestNotificationPermission(): Promise<boolean> {
  if (await hasPermission()) return true;
  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

/** A habit's reminder settings, as needed to schedule its notifications. */
export interface HabitReminder {
  name: string;
  reminderEnabled: boolean;
  reminderTime: string | null; // local 'HH:MM:SS'
  activeDays: number; // bitmask, bit0=Mon … bit6=Sun
}

// Map our Monday-first bit index (0=Mon…6=Sun) to expo's weekday (1=Sun…7=Sat).
const WEEKDAY_FOR_BIT = [2, 3, 4, 5, 6, 7, 1];

function parseTime(time: string | null, fallback = '09:00:00'): [number, number] {
  const [hour, minute] = (time ?? fallback).split(':').map(Number);
  return [hour, minute];
}

/**
 * Re-apply every scheduled reminder from saved state — the global daily nudge
 * plus a per-habit reminder on each of the habit's active weekdays. Never
 * prompts; if permission isn't granted it just clears the schedule.
 */
export async function rescheduleAllReminders(
  global: { enabled: boolean; time: string | null },
  habits: HabitReminder[],
): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
  if (!(await hasPermission())) return;

  // Global daily nudge (from Settings).
  if (global.enabled) {
    const [hour, minute] = parseTime(global.time);
    await Notifications.scheduleNotificationAsync({
      content: { title: 'Tucan', body: 'Time to check in on your habits.' },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DAILY, hour, minute },
    });
  }

  // Per-habit reminders, one weekly trigger per active day.
  for (const habit of habits) {
    if (!habit.reminderEnabled || !habit.reminderTime) continue;
    const [hour, minute] = parseTime(habit.reminderTime);
    for (let bit = 0; bit < 7; bit++) {
      if (((habit.activeDays >> bit) & 1) !== 1) continue;
      await Notifications.scheduleNotificationAsync({
        content: {
          title: habit.name,
          body: `Did you do "${habit.name}" today? Mark it done.`,
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
          weekday: WEEKDAY_FOR_BIT[bit],
          hour,
          minute,
        },
      });
    }
  }
}
