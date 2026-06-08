import DateTimePicker, {
  type DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import { useNavigation, useRouter } from 'expo-router';
import { SymbolView, type SFSymbol } from 'expo-symbols';
import { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  Easing,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';

import { IconColorPickerModal } from '@/components/IconColorPickerModal';
import { ALL_DAYS, fromDateKey, toDateKey, todayKey, type DateKey } from '@/lib/date';
import { HABIT_COLORS } from '@/lib/colors';
import { haptics } from '@/lib/haptics';
import { requestNotificationPermission } from '@/lib/notifications';
import {
  HABIT_ICON_SUGGESTIONS,
  HABIT_NAME_SUGGESTIONS,
  habitIcon,
  isEmojiIcon,
} from '@/lib/icons';
import {
  createHabit,
  currentProfile,
  deleteHabit,
  getHabit,
  updateHabit,
} from '@/store';

// Monday-first, matching the calendar and the active_days bitmask (bit0 = Mon).
const DAY_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function HabitForm({ habitId }: { habitId?: string }) {
  const router = useRouter();
  const navigation = useNavigation();
  const { theme } = useUnistyles();

  const existing = habitId ? getHabit(habitId) : undefined;
  const isEdit = !!existing;
  const isPremium = currentProfile()?.is_premium ?? false;

  const [name, setName] = useState(existing?.name ?? '');
  const [description, setDescription] = useState(existing?.description ?? '');
  const [icon, setIcon] = useState<SFSymbol | string>(habitIcon(existing?.icon));
  const [color, setColor] = useState<string | null>(existing?.color ?? null);
  const [startDate, setStartDate] = useState<DateKey>(existing?.start_date ?? todayKey());
  const [activeDays, setActiveDays] = useState(existing?.active_days ?? ALL_DAYS);
  const [reminderEnabled, setReminderEnabled] = useState(existing?.reminder_enabled ?? false);
  const [reminderTime, setReminderTime] = useState<string | null>(existing?.reminder_time ?? null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showReminderPicker, setShowReminderPicker] = useState(false);
  const [showIconColorPicker, setShowIconColorPicker] = useState(false);
  const [step, setStep] = useState<1 | 2>(1);
  const [stepTransitionAnim] = useState(() => new Animated.Value(0));
  const [fabScale] = useState(() => new Animated.Value(1));
  // Tracks keyboard height to float the FAB above it. The reported height
  // includes the QuickType suggestions bar, and we drive it on the native
  // thread (useNativeDriver) so the motion stays frame-perfect with no lag.
  const [keyboardHeight] = useState(() => new Animated.Value(0));

  useEffect(() => {
    // `will` events fire before the keyboard animates; match its duration and
    // easing curve so the FAB rides up in sync.
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const keyboardEasing = Easing.bezier(0.17, 0.59, 0.4, 0.77);

    const showSub = Keyboard.addListener(showEvent, (e) => {
      Animated.timing(keyboardHeight, {
        toValue: e.endCoordinates.height,
        duration: e.duration || 250,
        easing: keyboardEasing,
        useNativeDriver: true,
      }).start();
    });
    const hideSub = Keyboard.addListener(hideEvent, (e) => {
      Animated.timing(keyboardHeight, {
        toValue: 0,
        duration: e.duration || 250,
        easing: keyboardEasing,
        useNativeDriver: true,
      }).start();
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, [keyboardHeight]);

  // Two-step create: step 1 is just the name; edit shows everything at once.
  const onStep1 = !isEdit && step === 1;

  // Whether there are unsaved changes worth confirming before dismissing.
  const dirty = isEdit
    ? name.trim() !== existing.name ||
      (description.trim() || null) !== (existing.description ?? null) ||
      icon !== habitIcon(existing.icon) ||
      color !== (existing.color ?? null) ||
      startDate !== existing.start_date ||
      activeDays !== existing.active_days ||
      reminderEnabled !== existing.reminder_enabled ||
      (reminderTime ?? null) !== (existing.reminder_time ?? null)
    : name.trim() !== '' ||
      description.trim() !== '' ||
      color !== null ||
      icon !== habitIcon(undefined) ||
      reminderEnabled ||
      activeDays !== ALL_DAYS ||
      startDate !== todayKey() ||
      step === 2;

  // Keep the latest dirtiness readable from the navigation listener without
  // re-subscribing each keystroke. `saved` skips the prompt after a save/delete.
  const dirtyRef = useRef(dirty);
  const savedRef = useRef(false);
  useEffect(() => {
    dirtyRef.current = dirty;
  });

  // Block the native swipe-to-dismiss while there are unsaved changes, so the
  // sheet can't slip away and lose work; beforeRemove handles button/back. When
  // clean, allow the swipe to close freely.
  useEffect(() => {
    navigation.setOptions({ gestureEnabled: !dirty });
  }, [navigation, dirty]);

  // Confirm before discarding via the back/Cancel actions. Allow it freely once
  // saved/deleted or when untouched.
  useEffect(() => {
    const sub = navigation.addListener('beforeRemove', (e) => {
      if (savedRef.current || !dirtyRef.current) return;
      e.preventDefault();
      haptics.warning();
      Alert.alert(
        isEdit ? 'Discard changes?' : 'Discard this habit?',
        "If you leave now, your changes won't be saved.",
        [
          { text: 'Keep editing', style: 'cancel' },
          {
            text: 'Discard',
            style: 'destructive',
            onPress: () => navigation.dispatch(e.data.action),
          },
        ],
      );
    });
    return sub;
  }, [navigation, isEdit]);

  // Snappy icon morph (arrow <-> check). Ease-out so it resolves quickly and
  // feels coupled to the keyboard rather than dragging behind it.
  function morphFab(to: 0 | 1) {
    Animated.timing(stepTransitionAnim, {
      toValue: to,
      duration: 200,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }

  function goNext() {
    if (!canSave) return;
    haptics.selection();
    Keyboard.dismiss();
    morphFab(1);
    setStep(2);
  }

  function goBack() {
    haptics.selection();
    morphFab(0);
    setStep(1);
  }

  function toggleDay(i: number) {
    haptics.selection();
    setActiveDays((prev) => {
      const next = prev ^ (1 << i);
      return next === 0 ? prev : next; // keep at least one day
    });
  }

  const accent = color ?? theme.colors.ink;
  const canSave = name.trim().length > 0;

  // Quick-select row: the currently selected icon/emoji always sits first so
  // a pick from the modal is visible here, followed by the suggestions.
  const quickIcons: (SFSymbol | string)[] = [
    icon,
    ...HABIT_ICON_SUGGESTIONS.map((o) => o.key).filter((k) => k !== icon),
  ].slice(0, 18);

  function pickSuggestion(s: { name: string; icon: SFSymbol }) {
    haptics.selection();
    setName(s.name);
    setIcon(s.icon);
  }

  function onColorPress(value: string | null, premium: boolean) {
    if (premium && !isPremium) {
      haptics.warning();
      Alert.alert('Unlock colors', 'Custom habit colors are part of Tucan Premium.', [
        { text: 'Not now', style: 'cancel' },
        { text: 'See Premium', onPress: () => router.push('/settings') },
      ]);
      return;
    }
    haptics.selection();
    setColor(value);
  }

  function onDateChange(_event: DateTimePickerEvent, date?: Date) {
    if (Platform.OS !== 'ios') setShowDatePicker(false);
    if (date) setStartDate(toDateKey(date));
  }

  async function onToggleReminder(value: boolean) {
    haptics.light();
    if (value) {
      const granted = await requestNotificationPermission();
      if (!granted) {
        Alert.alert(
          'Notifications are off',
          'Turn on notifications for Tucan in iOS Settings to get habit reminders.',
        );
        return; // don't show it as on when it can't fire
      }
      setReminderTime((t) => t ?? '09:00:00'); // sensible default time
    }
    setReminderEnabled(value);
  }

  function onReminderTimeChange(_event: DateTimePickerEvent, date?: Date) {
    if (Platform.OS !== 'ios') setShowReminderPicker(false);
    if (date) setReminderTime(dateToTime(date));
  }

  function onSave() {
    if (!canSave) return;
    const payload = {
      name: name.trim(),
      description: description.trim() || null,
      icon,
      color,
      start_date: startDate,
      active_days: activeDays,
      reminder_enabled: reminderEnabled,
      reminder_time: reminderEnabled ? (reminderTime ?? '09:00:00') : reminderTime,
    };
    if (isEdit && habitId) {
      updateHabit(habitId, payload);
    } else {
      createHabit(payload);
    }
    savedRef.current = true; // skip the discard prompt on the way out
    haptics.success();
    router.back();
  }

  function onDelete() {
    if (!habitId) return;
    haptics.warning();
    Alert.alert('Delete habit', "This removes the habit and all its history. This can't be undone.", [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          savedRef.current = true; // skip the discard prompt on the way out
          deleteHabit(habitId);
          router.dismissAll();
        },
      },
    ]);
  }

  return (
    <View style={styles.container}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.header}>
        {onStep1 ? (
          <Pressable hitSlop={10} onPress={() => router.back()}>
            <Text style={styles.cancel}>Cancel</Text>
          </Pressable>
        ) : (
          <Pressable hitSlop={10} onPress={() => (isEdit ? router.back() : goBack())}>
            {isEdit ? (
              <Text style={styles.cancel}>Cancel</Text>
            ) : (
              <SymbolView name="chevron.left" size={22} tintColor={theme.colors.textPrimary} />
            )}
          </Pressable>
        )}

        <Text style={styles.headerTitle} numberOfLines={1}>
          {isEdit ? 'Edit habit' : onStep1 ? 'New habit' : name.trim() || 'New habit'}
        </Text>

        {onStep1 ? (
          <Pressable hitSlop={10} disabled={!canSave} onPress={goNext}>
            <Text style={[styles.save, !canSave && styles.saveDisabled]}>Next</Text>
          </Pressable>
        ) : (
          <Pressable hitSlop={10} disabled={!canSave} onPress={onSave}>
            <Text style={[styles.save, !canSave && styles.saveDisabled]}>Save</Text>
          </Pressable>
        )}
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>
        {onStep1 ? (
          <View style={styles.step1}>
            <TextInput
              value={name}
              onChangeText={(t) => setName(t.replace(/\n/g, ''))}
              placeholder="Habit name"
              placeholderTextColor={theme.colors.textMuted}
              style={styles.xxlInput}
              autoFocus
              maxLength={40}
              multiline
            />
            <View style={styles.suggestionsBlock}>
              <Text style={styles.suggestionsLabel}>Suggestions</Text>
              <View style={styles.suggestionsWrap}>
                {HABIT_NAME_SUGGESTIONS.map((s) => (
                  <Pressable
                    key={s.name}
                    style={({ pressed }) => [styles.chip, pressed && styles.pressed]}
                    onPress={() => pickSuggestion(s)}>
                    <SymbolView name={s.icon} size={15} tintColor={theme.colors.textPrimary} />
                    <Text style={styles.chipText}>{s.name}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
          </View>
        ) : (
          <>
            {isEdit && (
              <Field label="Name">
                <TextInput
                  value={name}
                  onChangeText={setName}
                  placeholder="e.g. Drink water"
                  placeholderTextColor={theme.colors.textMuted}
                  style={styles.input}
                  returnKeyType="done"
                />
              </Field>
            )}

            {isEdit && (
              <Field label="Description">
                <TextInput
                  value={description}
                  onChangeText={setDescription}
                  placeholder="Add a note (optional)"
                  placeholderTextColor={theme.colors.textMuted}
                  style={styles.input}
                  multiline
                />
              </Field>
            )}

        {/* Icon */}
        <Field label="Icon">
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.iconRow}>
            {quickIcons.map((key) => {
              const selected = key === icon;
              return (
                <Pressable
                  key={key}
                  accessibilityRole="button"
                  accessibilityLabel={`${key} icon`}
                  accessibilityState={{ selected }}
                  onPress={() => {
                    haptics.selection();
                    setIcon(key);
                  }}
                  style={[styles.iconCell, selected && { borderColor: accent }]}>
                  {isEmojiIcon(key) ? (
                    <Text style={styles.iconEmoji}>{key}</Text>
                  ) : (
                    <SymbolView
                      name={key as SFSymbol}
                      size={22}
                      tintColor={selected ? accent : theme.colors.textSecondary}
                    />
                  )}
                </Pressable>
              );
            })}
          </ScrollView>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="View more icons"
            onPress={() => {
              haptics.selection();
              setShowIconColorPicker(true);
            }}
            style={({ pressed }) => [styles.viewMore, pressed && styles.pressed]}>
            <Text style={styles.viewMoreText}>View more</Text>
          </Pressable>
        </Field>

        {/* Color */}
        <Field label="Color">
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.colorRow}>
            {HABIT_COLORS.map((opt) => {
              const selected = opt.value === color;
              const swatch = opt.value ?? theme.colors.ink;
              const locked = opt.premium && !isPremium;
              return (
                <Pressable
                  key={opt.label}
                  hitSlop={8}
                  accessibilityRole="button"
                  accessibilityLabel={locked ? `${opt.label} color (premium)` : `${opt.label} color`}
                  accessibilityState={{ selected }}
                  onPress={() => onColorPress(opt.value, opt.premium)}
                  style={[styles.swatch, { backgroundColor: swatch }]}>
                  {locked ? (
                    <SymbolView name="lock.fill" size={12} tintColor={theme.colors.canvas} />
                  ) : (
                    selected && (
                      <SymbolView name="checkmark" size={14} weight="bold" tintColor={theme.colors.canvas} />
                    )
                  )}
                </Pressable>
              );
            })}
          </ScrollView>
        </Field>

        {/* Start date */}
        <Field label="Start date">
          <Pressable
            style={({ pressed }) => [styles.dateButton, pressed && styles.pressed]}
            onPress={() => setShowDatePicker((s) => !s)}>
            <Text style={styles.dateText}>{formatDate(startDate)}</Text>
            <SymbolView name="calendar" size={18} tintColor={theme.colors.textSecondary} />
          </Pressable>
          <PickerPopup visible={showDatePicker} onClose={() => setShowDatePicker(false)}>
            <DateTimePicker
              value={fromDateKey(startDate)}
              mode="date"
              display={Platform.OS === 'ios' ? 'inline' : 'default'}
              maximumDate={new Date()}
              onChange={onDateChange}
              accentColor={accent}
            />
          </PickerPopup>
        </Field>

        {/* Active weekdays */}
        <Field label="Days">
          <View style={styles.daysRow}>
            {DAY_LABELS.map((d, i) => {
              const on = ((activeDays >> i) & 1) === 1;
              return (
                <Pressable
                  key={i}
                  accessibilityRole="button"
                  accessibilityLabel={DAY_NAMES[i]}
                  accessibilityState={{ selected: on }}
                  onPress={() => toggleDay(i)}
                  style={[styles.dayPill, on ? { backgroundColor: accent } : styles.dayPillOff]}>
                  <Text style={[styles.dayText, on && { color: theme.colors.canvas }]}>{d}</Text>
                </Pressable>
              );
            })}
          </View>
          <Text style={styles.daysHint}>Tap to turn days off — they won&apos;t count.</Text>
        </Field>

        {/* Reminder */}
        <Field label="Reminder">
          <View style={styles.reminderRow}>
            <Text style={styles.reminderLabel}>Remind me to check in</Text>
            <Switch
              value={reminderEnabled}
              onValueChange={onToggleReminder}
              trackColor={{ true: theme.colors.ink, false: theme.colors.separator }}
            />
          </View>
          {reminderEnabled && (
            <>
              <Pressable
                style={({ pressed }) => [styles.dateButton, pressed && styles.pressed]}
                onPress={() => setShowReminderPicker((s) => !s)}>
                <Text style={styles.dateText}>{formatTime(reminderTime)}</Text>
                <SymbolView name="clock" size={18} tintColor={theme.colors.textSecondary} />
              </Pressable>
              <PickerPopup
                visible={showReminderPicker}
                onClose={() => setShowReminderPicker(false)}>
                <DateTimePicker
                  value={timeToDate(reminderTime)}
                  mode="time"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={onReminderTimeChange}
                  accentColor={accent}
                />
              </PickerPopup>
              <Text style={styles.daysHint}>
                We&apos;ll nudge you on your active days at this time.
              </Text>
            </>
          )}
        </Field>

            {isEdit && (
              <Pressable
                style={({ pressed }) => [styles.delete, pressed && styles.pressed]}
                onPress={onDelete}>
                <Text style={styles.deleteText}>Delete habit</Text>
              </Pressable>
            )}
          </>
        )}
      </ScrollView>
      </KeyboardAvoidingView>

      {(onStep1 || !isEdit) && (
        <Animated.View
          style={[
            styles.fabBar,
            { transform: [{ translateY: Animated.multiply(keyboardHeight, -1) }] },
          ]}>
          <AnimatedPressable
            accessibilityRole="button"
            accessibilityLabel={onStep1 ? 'Next' : 'Save'}
            disabled={!canSave}
            onPress={onStep1 ? goNext : onSave}
            onPressIn={() => {
              Animated.timing(fabScale, {
                toValue: 1.3,
                duration: 120,
                useNativeDriver: true,
              }).start();
            }}
            onPressOut={() => {
              Animated.timing(fabScale, {
                toValue: 1,
                duration: 120,
                useNativeDriver: true,
              }).start();
            }}
            style={[
              styles.nextFab,
              !canSave && styles.nextFabDisabled,
              { transform: [{ scale: fabScale }] },
            ]}>
            {/* Arrow icon - fades out */}
            <Animated.View
              style={{
                position: 'absolute',
                opacity: stepTransitionAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [1, 0],
                }),
              }}>
              <SymbolView
                name="arrow.right"
                size={26}
                weight="bold"
                tintColor={theme.colors.canvas}
              />
            </Animated.View>

            {/* Checkmark icon - fades in */}
            <Animated.View
              style={{
                position: 'absolute',
                opacity: stepTransitionAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, 1],
                }),
              }}>
              <SymbolView
                name="checkmark"
                size={26}
                weight="bold"
                tintColor={theme.colors.canvas}
              />
            </Animated.View>
          </AnimatedPressable>
        </Animated.View>
      )}

      <IconColorPickerModal
        key={showIconColorPicker ? `open-${icon}` : 'closed'}
        visible={showIconColorPicker}
        currentIcon={icon}
        onSelect={(selectedIcon) => {
          haptics.selection();
          setIcon(selectedIcon);
        }}
        onClose={() => setShowIconColorPicker(false)}
      />
    </View>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      {children}
    </View>
  );
}

/**
 * Shows a date/time picker as a centered popup on iOS (tap-outside or Done to
 * dismiss). On Android the native picker is already a dialog, so the child is
 * rendered directly when visible.
 */
function PickerPopup({
  visible,
  onClose,
  children,
}: {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
}) {
  if (Platform.OS !== 'ios') {
    return visible ? <>{children}</> : null;
  }
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.popupBackdrop} onPress={onClose}>
        <Pressable style={styles.popupCard} onPress={() => {}}>
          {children}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Done"
            onPress={onClose}
            style={({ pressed }) => [styles.popupDone, pressed && styles.pressed]}>
            <Text style={styles.popupDoneText}>Done</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function formatDate(key: DateKey): string {
  return fromDateKey(key).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

const pad = (n: number) => String(n).padStart(2, '0');

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
    position: 'relative',
  },
  flex: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.space.lg,
    paddingTop: 40,
    paddingBottom: theme.space.md,
  },
  headerTitle: {
    fontSize: theme.font.heading,
    fontWeight: theme.weight.semibold,
    color: theme.colors.textPrimary,
  },
  cancel: {
    fontSize: theme.font.body,
    color: theme.colors.textSecondary,
  },
  save: {
    fontSize: theme.font.body,
    fontWeight: theme.weight.bold,
    color: theme.colors.textPrimary,
  },
  saveDisabled: {
    color: theme.colors.textMuted,
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: theme.space.lg,
    paddingBottom: rt.insets.bottom + theme.space.xxxl,
    gap: theme.space.md,
  },
  fabBar: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    zIndex: 10,
  },
  nextFab: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: theme.colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nextFabDisabled: {
    opacity: 0.35,
  },
  field: {
    gap: theme.space.md,
    backgroundColor: theme.colors.card,
    borderRadius: theme.radius.lg,
    padding: theme.space.lg,
  },
  fieldLabel: {
    fontSize: theme.font.caption,
    fontWeight: theme.weight.medium,
    color: theme.colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  input: {
    fontSize: theme.font.body,
    color: theme.colors.textPrimary,
    backgroundColor: theme.colors.canvas,
    borderRadius: theme.radius.md,
    paddingHorizontal: theme.space.lg,
    paddingVertical: theme.space.md,
    minHeight: 48,
  },
  step1: {
    gap: theme.space.xl,
    paddingTop: theme.space.lg,
  },
  xxlInput: {
    fontSize: 40,
    fontWeight: theme.weight.bold,
    letterSpacing: -1,
    color: theme.colors.textPrimary,
    paddingVertical: theme.space.sm,
  },
  suggestionsBlock: {
    gap: theme.space.sm,
  },
  suggestionsLabel: {
    fontSize: theme.font.caption,
    fontWeight: theme.weight.medium,
    color: theme.colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  suggestionsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.space.sm,
  },
  daysRow: {
    flexDirection: 'row',
    gap: theme.space.sm,
  },
  dayPill: {
    flex: 1,
    height: 44,
    borderRadius: theme.radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayPillOff: {
    backgroundColor: theme.colors.canvas,
  },
  dayText: {
    fontSize: theme.font.body,
    fontWeight: theme.weight.semibold,
    color: theme.colors.textSecondary,
  },
  daysHint: {
    fontSize: theme.font.caption,
    color: theme.colors.textMuted,
  },
  reminderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 32,
  },
  reminderLabel: {
    fontSize: theme.font.body,
    color: theme.colors.textPrimary,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.space.xs,
    paddingHorizontal: theme.space.md,
    paddingVertical: theme.space.sm,
    borderRadius: theme.radius.pill,
    borderWidth: 1,
    borderColor: theme.colors.textPrimary,
  },
  chipText: {
    fontSize: theme.font.caption,
    color: theme.colors.textPrimary,
  },
  iconRow: {
    flexDirection: 'row',
    gap: theme.space.sm,
    paddingRight: theme.space.lg,
  },
  viewMore: {
    marginTop: theme.space.xs,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.space.md,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.canvas,
  },
  viewMoreText: {
    fontSize: theme.font.body,
    fontWeight: theme.weight.semibold,
    color: theme.colors.textPrimary,
  },
  iconCell: {
    width: 52,
    height: 52,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.canvas,
    borderWidth: 2,
    borderColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconEmoji: {
    fontSize: 26,
  },
  colorRow: {
    flexDirection: 'row',
    gap: theme.space.md,
    paddingRight: theme.space.lg,
  },
  swatch: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  swatchSelected: {
    borderColor: theme.colors.textPrimary,
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.colors.canvas,
    borderRadius: theme.radius.md,
    paddingHorizontal: theme.space.lg,
    paddingVertical: theme.space.md,
    minHeight: 48,
  },
  dateText: {
    fontSize: theme.font.body,
    color: theme.colors.textPrimary,
  },
  delete: {
    marginTop: theme.space.md,
    height: 52,
    borderRadius: theme.radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteText: {
    fontSize: theme.font.body,
    fontWeight: theme.weight.semibold,
    color: theme.colors.accent,
  },
  pressed: {
    opacity: 0.7,
  },
  popupBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: theme.space.xl,
  },
  popupCard: {
    width: '100%',
    backgroundColor: theme.colors.card,
    borderRadius: theme.radius.lg,
    padding: theme.space.md,
  },
  popupDone: {
    marginTop: theme.space.sm,
    height: 48,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  popupDoneText: {
    fontSize: theme.font.body,
    fontWeight: theme.weight.semibold,
    color: theme.colors.canvas,
  },
}));
