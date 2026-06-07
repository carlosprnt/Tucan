import '@/theme/unistyles';

import DateTimePicker, {
  type DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import { observer, use$ } from '@legendapp/state/react';
import { useRouter } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useState } from 'react';
import { Alert, Platform, Pressable, ScrollView, Switch, Text, View } from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';

import { DottedSeparator } from '@/components/DottedSeparator';
import { haptics } from '@/lib/haptics';
import { requestNotificationPermission } from '@/lib/notifications';
import { applyThemePref } from '@/lib/theme-control';
import {
  auth$,
  currentProfile,
  signOut,
  updateProfile,
  type ThemePref,
} from '@/store';

const THEME_OPTIONS: ThemePref[] = ['light', 'dark', 'auto'];

const Settings = observer(function Settings() {
  const router = useRouter();
  const { theme } = useUnistyles();

  const email = use$(() => auth$.session.get()?.user.email ?? '');
  const profile = currentProfile();
  const themePref = profile?.theme_pref ?? 'auto';
  const reminderEnabled = profile?.reminder_enabled ?? false;
  const reminderTime = profile?.reminder_time ?? null;
  const isPremium = profile?.is_premium ?? false;

  const [showTimePicker, setShowTimePicker] = useState(false);

  function onSelectTheme(pref: ThemePref) {
    haptics.selection();
    applyThemePref(pref);
    updateProfile({ theme_pref: pref });
  }

  async function onToggleReminder(value: boolean) {
    haptics.light();
    if (value) {
      const granted = await requestNotificationPermission();
      if (!granted) {
        Alert.alert(
          'Notifications are off',
          'Turn on notifications for Tucan in iOS Settings to get a daily reminder.',
        );
        return; // don't show the switch as on when it can't fire
      }
    }
    // The root layout reschedules from the saved preference.
    updateProfile({
      reminder_enabled: value,
      reminder_time: value ? (reminderTime ?? '09:00:00') : reminderTime,
    });
  }

  function confirmSignOut() {
    haptics.warning();
    Alert.alert('Sign out?', 'Your habits stay synced and will be here when you’re back.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: () => void signOut() },
    ]);
  }

  function onTimeChange(_e: DateTimePickerEvent, date?: Date) {
    if (Platform.OS !== 'ios') setShowTimePicker(false);
    if (date) updateProfile({ reminder_time: dateToTime(date) });
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}>
      <View style={styles.headerRow}>
        <Pressable hitSlop={12} onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Back" style={styles.back}>
          <SymbolView name="chevron.left" size={22} tintColor={theme.colors.textPrimary} />
        </Pressable>
        <Text style={styles.title}>Settings</Text>
        <View style={styles.back} />
      </View>

      {/* Theme */}
      <Section label="Appearance">
        <View style={styles.segmented}>
          {THEME_OPTIONS.map((opt) => (
            <Pressable
              key={opt}
              onPress={() => onSelectTheme(opt)}
              style={[styles.segment, themePref === opt && styles.segmentActive]}>
              <Text style={[styles.segmentText, themePref === opt && styles.segmentTextActive]}>
                {opt[0].toUpperCase() + opt.slice(1)}
              </Text>
            </Pressable>
          ))}
        </View>
      </Section>

      {/* Reminder */}
      <Section label="Daily reminder">
        <View style={styles.row}>
          <Text style={styles.rowLabel}>Remind me every day</Text>
          <Switch
            value={reminderEnabled}
            onValueChange={onToggleReminder}
            trackColor={{ true: theme.colors.ink, false: theme.colors.separator }}
          />
        </View>
        {reminderEnabled && (
          <>
            <Pressable
              style={({ pressed }) => [styles.row, pressed && styles.pressed]}
              onPress={() => setShowTimePicker((s) => !s)}>
              <Text style={styles.rowLabel}>Time</Text>
              <Text style={styles.rowValue}>{formatTime(reminderTime)}</Text>
            </Pressable>
            {showTimePicker && (
              <DateTimePicker
                value={timeToDate(reminderTime)}
                mode="time"
                display="spinner"
                onChange={onTimeChange}
              />
            )}
          </>
        )}
        <Text style={styles.note}>
          We&apos;ll nudge you once a day at this time. Requires notification access.
        </Text>
      </Section>

      {/* Premium */}
      <Section label="Premium">
        {isPremium ? (
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Custom habit colors</Text>
            <Text style={styles.rowValue}>Active</Text>
          </View>
        ) : (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Get Tucan Premium"
            style={({ pressed }) => [styles.row, pressed && styles.pressed]}
            onPress={() => {
              haptics.light();
              Alert.alert('Tucan Premium', 'Custom habit colors and more — coming soon.');
            }}>
            <View style={styles.premiumText}>
              <Text style={styles.rowLabel}>Get Tucan Premium</Text>
              <Text style={styles.note}>Custom habit colors and more.</Text>
            </View>
            <SymbolView name="chevron.right" size={16} tintColor={theme.colors.textMuted} />
          </Pressable>
        )}
      </Section>

      {/* Account */}
      <Section label="Account">
        <View style={styles.row}>
          <Text style={styles.rowLabel}>Signed in as</Text>
          <Text style={styles.rowValue} numberOfLines={1}>
            {email}
          </Text>
        </View>
        <DottedSeparator />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Sign out"
          style={({ pressed }) => [styles.signOut, pressed && styles.pressed]}
          onPress={confirmSignOut}>
          <Text style={styles.signOutText}>Sign out</Text>
        </Pressable>
      </Section>
    </ScrollView>
  );
});

export default Settings;

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionLabel}>{label}</Text>
      <View style={styles.sectionBody}>{children}</View>
    </View>
  );
}

function pad(n: number): string {
  return String(n).padStart(2, '0');
}
function timeToDate(t?: string | null): Date {
  const d = new Date();
  if (t) {
    const [h, m] = t.split(':').map(Number);
    d.setHours(h, m, 0, 0);
  } else {
    d.setHours(9, 0, 0, 0);
  }
  return d;
}
function dateToTime(d: Date): string {
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:00`;
}
function formatTime(t?: string | null): string {
  return timeToDate(t).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

const styles = StyleSheet.create((theme, rt) => ({
  container: {
    flex: 1,
    backgroundColor: theme.colors.canvas,
  },
  content: {
    paddingHorizontal: theme.space.lg,
    paddingTop: rt.insets.top + theme.space.sm,
    paddingBottom: rt.insets.bottom + theme.space.xxxl,
    gap: theme.space.xl,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  back: {
    width: 40,
    height: 40,
    justifyContent: 'center',
  },
  title: {
    fontSize: theme.font.heading,
    fontWeight: theme.weight.semibold,
    color: theme.colors.textPrimary,
  },
  section: {
    gap: theme.space.sm,
  },
  sectionLabel: {
    fontSize: theme.font.caption,
    fontWeight: theme.weight.medium,
    color: theme.colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sectionBody: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.radius.md,
    paddingHorizontal: theme.space.lg,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 52,
    gap: theme.space.md,
  },
  rowLabel: {
    fontSize: theme.font.body,
    color: theme.colors.textPrimary,
    flexShrink: 1,
  },
  rowValue: {
    fontSize: theme.font.body,
    color: theme.colors.textSecondary,
    flexShrink: 1,
  },
  segmented: {
    flexDirection: 'row',
    backgroundColor: theme.colors.card,
    borderRadius: theme.radius.md,
    padding: 4,
    gap: 4,
  },
  segment: {
    flex: 1,
    paddingVertical: theme.space.sm,
    borderRadius: theme.radius.sm,
    alignItems: 'center',
  },
  segmentActive: {
    backgroundColor: theme.colors.canvas,
  },
  segmentText: {
    fontSize: theme.font.body,
    color: theme.colors.textSecondary,
  },
  segmentTextActive: {
    color: theme.colors.textPrimary,
    fontWeight: theme.weight.semibold,
  },
  note: {
    fontSize: theme.font.caption,
    color: theme.colors.textMuted,
    marginTop: theme.space.xs,
  },
  premiumText: {
    flex: 1,
    gap: 2,
  },
  signOut: {
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  signOutText: {
    fontSize: theme.font.body,
    fontWeight: theme.weight.semibold,
    color: theme.colors.accent,
  },
  pressed: {
    opacity: 0.7,
  },
}));
