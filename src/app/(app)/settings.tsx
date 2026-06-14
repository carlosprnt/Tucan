import '@/theme/unistyles';

import DateTimePicker, {
  type DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import { observer, use$ } from '@legendapp/state/react';
import { useRouter, type Href } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useState } from 'react';
import { Alert, Linking, Platform, Pressable, ScrollView, Switch, Text, View } from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';

import { DottedSeparator } from '@/components/DottedSeparator';
import { haptics } from '@/lib/haptics';
import { requestNotificationPermission } from '@/lib/notifications';
import { applyThemePref } from '@/lib/theme-control';
import {
  auth$,
  currentProfile,
  deleteAccount,
  DEMO_PRESETS,
  demoMode$,
  enterDemo,
  exitDemo,
  inTrial,
  isAdmin,
  isPremium,
  isSubscribed,
  restorePurchases,
  setProOverride,
  signOut,
  trialDaysLeft,
  updateProfile,
  type ThemePref,
} from '@/store';

const THEME_OPTIONS: ThemePref[] = ['light', 'dark', 'auto'];

const Settings = observer(function Settings() {
  const { theme } = useUnistyles();
  const router = useRouter();

  const email = use$(() => auth$.session.get()?.user.email ?? '');
  const profile = currentProfile();
  const themePref = profile?.theme_pref ?? 'auto';
  const reminderEnabled = profile?.reminder_enabled ?? false;
  const reminderTime = profile?.reminder_time ?? null;
  const premium = isPremium();
  const admin = isAdmin();
  const demoPreset = use$(demoMode$.preset);
  const subscribed = isSubscribed();
  const trialing = inTrial();
  const daysLeft = trialDaysLeft();

  const [showTimePicker, setShowTimePicker] = useState(false);

  function onTogglePro(value: boolean) {
    haptics.light();
    setProOverride(value);
  }

  async function onRestore() {
    haptics.light();
    const ok = await restorePurchases();
    Alert.alert(
      ok ? 'Purchases restored' : 'Nothing to restore',
      ok
        ? 'Your subscription is active again.'
        : 'We couldn’t find an active subscription on this account.',
    );
  }

  function onEnterDemo(presetId: string) {
    haptics.selection();
    enterDemo(presetId);
    router.back(); // close settings so the demo dashboard is visible
  }

  function onExitDemo() {
    haptics.selection();
    exitDemo();
    router.back();
  }

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

  function confirmDeleteAccount() {
    haptics.warning();
    Alert.alert(
      'Delete account?',
      'This permanently deletes your account and all your habits and history from the server. This can’t be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete account',
          style: 'destructive',
          onPress: () => {
            void deleteAccount().catch(() => {
              Alert.alert('Couldn’t delete account', 'Something went wrong. Please try again.');
            });
          },
        },
      ],
    );
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
      <View style={styles.header}>
        <Text style={styles.title}>Settings</Text>
        <Pressable
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="Close"
          onPress={() => {
            haptics.selection();
            router.back();
          }}
          style={({ pressed }) => [styles.closeBtn, pressed && styles.pressed]}>
          <SymbolView name="xmark" size={16} weight="semibold" tintColor={theme.colors.textSecondary} />
        </Pressable>
      </View>

      {/* Theme */}
      <Section label="Appearance">
        <View style={styles.segmented}>
          {THEME_OPTIONS.map((opt) => (
            <Pressable
              key={opt}
              accessibilityRole="radio"
              accessibilityState={{ selected: themePref === opt }}
              accessibilityLabel={opt}
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
        <Text style={[styles.note, styles.reminderNote]}>
          We&apos;ll nudge you once a day at this time. Requires notification access.
        </Text>
      </Section>

      {/* Subscription */}
      <Section label="Subscription">
        {admin ? (
          <View style={styles.row}>
            <View style={styles.premiumText}>
              <Text style={styles.rowLabel}>Pro features</Text>
              <Text style={styles.note}>Admin override — force Pro on/off.</Text>
            </View>
            <Switch
              value={premium}
              onValueChange={onTogglePro}
              trackColor={{ true: theme.colors.ink, false: theme.colors.separator }}
            />
          </View>
        ) : subscribed ? (
          <>
            <View style={styles.row}>
              <Text style={styles.rowLabel}>Tucan Pro</Text>
              <Text style={styles.rowValue}>Active</Text>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Manage subscription"
              style={({ pressed }) => [styles.row, pressed && styles.pressed]}
              onPress={() => {
                haptics.selection();
                void Linking.openURL('https://apps.apple.com/account/subscriptions');
              }}>
              <Text style={styles.rowLabel}>Manage subscription</Text>
              <SymbolView name="chevron.right" size={16} tintColor={theme.colors.textMuted} />
            </Pressable>
          </>
        ) : (
          <>
            {trialing && (
              <View style={styles.row}>
                <Text style={styles.rowLabel}>Free trial</Text>
                <Text style={styles.rowValue}>
                  {daysLeft} {daysLeft === 1 ? 'day' : 'days'} left
                </Text>
              </View>
            )}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Get Tucan Pro"
              style={({ pressed }) => [styles.row, pressed && styles.pressed]}
              onPress={() => {
                haptics.light();
                router.push('/paywall' as Href);
              }}>
              <View style={styles.premiumText}>
                <Text style={styles.rowLabel}>Get Tucan Pro</Text>
                <Text style={styles.note}>Unlimited tracking, colors and insights.</Text>
              </View>
              <SymbolView name="chevron.right" size={16} tintColor={theme.colors.textMuted} />
            </Pressable>
          </>
        )}
        <DottedSeparator />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Restore purchases"
          style={({ pressed }) => [styles.row, pressed && styles.pressed]}
          onPress={onRestore}>
          <Text style={styles.rowLabel}>Restore purchases</Text>
        </Pressable>
      </Section>

      {/* Demo (admin only) — local fake content; never touches your real data. */}
      {admin && (
        <Section label="Demo">
          {DEMO_PRESETS.map((p, i) => (
            <View key={p.id}>
              {i > 0 && <DottedSeparator />}
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={p.label}
                accessibilityState={{ selected: demoPreset === p.id }}
                style={({ pressed }) => [styles.row, pressed && styles.pressed]}
                onPress={() => onEnterDemo(p.id)}>
                <View style={styles.premiumText}>
                  <Text style={styles.rowLabel}>{p.label}</Text>
                  <Text style={styles.note}>{p.description}</Text>
                </View>
                {demoPreset === p.id && (
                  <SymbolView name="checkmark" size={16} weight="semibold" tintColor={theme.colors.ink} />
                )}
              </Pressable>
            </View>
          ))}
          {demoPreset != null && (
            <>
              <DottedSeparator />
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Exit demo"
                style={({ pressed }) => [styles.signOut, pressed && styles.pressed]}
                onPress={onExitDemo}>
                <Text style={styles.signOutText}>Exit demo — back to my account</Text>
              </Pressable>
            </>
          )}
        </Section>
      )}

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

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Delete account"
        style={({ pressed }) => [styles.deleteAccount, pressed && styles.pressed]}
        onPress={confirmDeleteAccount}>
        <Text style={styles.deleteAccountText}>Delete account</Text>
      </Pressable>
    </ScrollView>
  );
});

export default Settings;

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionLabel}>{label}</Text>
      {children}
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
    paddingTop: theme.space.xl,
    paddingBottom: rt.insets.bottom + theme.space.xxl,
    gap: theme.space.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.card,
  },
  title: {
    fontSize: theme.font.title,
    fontWeight: theme.weight.bold,
    letterSpacing: -0.5,
    color: theme.colors.textPrimary,
  },
  section: {
    gap: theme.space.sm,
    backgroundColor: theme.colors.card,
    borderRadius: theme.radius.lg,
    paddingHorizontal: theme.space.lg,
    paddingVertical: theme.space.md,
  },
  sectionLabel: {
    fontSize: theme.font.caption,
    fontWeight: theme.weight.medium,
    color: theme.colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
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
    backgroundColor: theme.colors.canvas,
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
    backgroundColor: theme.colors.ink,
  },
  segmentText: {
    fontSize: theme.font.body,
    color: theme.colors.textSecondary,
  },
  segmentTextActive: {
    color: theme.colors.canvas,
    fontWeight: theme.weight.semibold,
  },
  note: {
    fontSize: theme.font.caption,
    color: theme.colors.textMuted,
    marginTop: theme.space.xs,
  },
  // Pull the reminder note up so it hugs the control like Premium's note does
  // (the section gap would otherwise add too much space above it).
  reminderNote: {
    marginTop: -2,
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
  deleteAccount: {
    alignItems: 'center',
    paddingVertical: theme.space.md,
  },
  deleteAccountText: {
    fontSize: theme.font.caption,
    fontWeight: theme.weight.medium,
    color: theme.colors.accent,
  },
  pressed: {
    opacity: 0.7,
  },
}));
