import * as Haptics from 'expo-haptics';

/**
 * Thin haptics wrapper — fire-and-forget. Use to make key moments tactile:
 * marking a day (medium), selections/taps (selection/light), success/warning.
 */
export const haptics = {
  light: () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  },
  medium: () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  },
  selection: () => {
    void Haptics.selectionAsync();
  },
  success: () => {
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  },
  warning: () => {
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
  },
};
