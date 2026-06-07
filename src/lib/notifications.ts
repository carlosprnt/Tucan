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

/**
 * Re-apply the single daily reminder from the saved preference. Never prompts —
 * if permission isn't granted yet, it just clears any schedule.
 */
export async function rescheduleReminder(
  enabled: boolean,
  time: string | null,
): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
  if (!enabled || !(await hasPermission())) return;

  const [hour, minute] = (time ?? '09:00:00').split(':').map(Number);
  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Tucan',
      body: 'Time to check in on your habits.',
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour,
      minute,
    },
  });
}
