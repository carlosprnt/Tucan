import DateTimePicker, {
  type DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import { useRouter } from 'expo-router';
import { SymbolView, type SFSymbol } from 'expo-symbols';
import { useState } from 'react';
import {
  Alert,
  Animated,
  Easing,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';

import { IconColorPickerModal } from '@/components/IconColorPickerModal';
import { ALL_DAYS, fromDateKey, toDateKey, todayKey, type DateKey } from '@/lib/date';
import { HABIT_COLORS } from '@/lib/colors';
import { haptics } from '@/lib/haptics';
import {
  HABIT_ICON_SUGGESTIONS,
  HABIT_NAME_SUGGESTIONS,
  habitIcon,
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

export function HabitForm({ habitId }: { habitId?: string }) {
  const router = useRouter();
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
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showIconColorPicker, setShowIconColorPicker] = useState(false);
  const [step, setStep] = useState<1 | 2>(1);
  const [stepTransitionAnim] = useState(() => new Animated.Value(0));

  // Two-step create: step 1 is just the name; edit shows everything at once.
  const onStep1 = !isEdit && step === 1;

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

  function onSave() {
    if (!canSave) return;
    const payload = {
      name: name.trim(),
      description: description.trim() || null,
      icon,
      color,
      start_date: startDate,
      active_days: activeDays,
    };
    if (isEdit && habitId) {
      updateHabit(habitId, payload);
    } else {
      createHabit(payload);
    }
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
          <View style={styles.iconRow}>
            {HABIT_ICON_SUGGESTIONS.slice(0, 9).map((opt) => {
              const selected = opt.key === icon;
              return (
                <Pressable
                  key={opt.key}
                  accessibilityRole="button"
                  accessibilityLabel={`${opt.label} icon`}
                  accessibilityState={{ selected }}
                  onPress={() => {
                    haptics.selection();
                    setIcon(opt.key);
                  }}
                  style={[styles.iconCell, selected && { borderColor: accent }]}>
                  <SymbolView
                    name={opt.key}
                    size={22}
                    tintColor={selected ? accent : theme.colors.textSecondary}
                  />
                </Pressable>
              );
            })}

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Show all icons"
              onPress={() => {
                haptics.selection();
                setShowIconColorPicker(true);
              }}
              style={styles.iconCell}>
              <SymbolView
                name="ellipsis"
                size={20}
                tintColor={theme.colors.textSecondary}
              />
            </Pressable>
          </View>
        </Field>

        {/* Color */}
        <Field label="Color">
          <View style={styles.colorRow}>
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
          </View>
        </Field>

        {/* Start date */}
        <Field label="Start date">
          <Pressable
            style={({ pressed }) => [styles.dateButton, pressed && styles.pressed]}
            onPress={() => setShowDatePicker((s) => !s)}>
            <Text style={styles.dateText}>{formatDate(startDate)}</Text>
            <SymbolView name="calendar" size={18} tintColor={theme.colors.textSecondary} />
          </Pressable>
          {showDatePicker && (
            <DateTimePicker
              value={fromDateKey(startDate)}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              maximumDate={new Date()}
              onChange={onDateChange}
              accentColor={accent}
            />
          )}
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

      {(onStep1 || !isEdit) && (
        <View style={styles.fabBar}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={onStep1 ? 'Next' : 'Save'}
            disabled={!canSave}
            onPress={onStep1 ? goNext : onSave}
            style={({ pressed }) => [
              styles.nextFab,
              !canSave && styles.nextFabDisabled,
              pressed && styles.pressed,
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
          </Pressable>
        </View>
      )}
      </KeyboardAvoidingView>

      <IconColorPickerModal
        visible={showIconColorPicker}
        currentIcon={icon}
        currentColor={color}
        onSelect={(selectedIcon, selectedColor) => {
          haptics.selection();
          setIcon(selectedIcon);
          setColor(selectedColor);
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

function formatDate(key: DateKey): string {
  return fromDateKey(key).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
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
    gap: theme.space.xl,
  },
  fabBar: {
    alignItems: 'flex-end',
    paddingRight: 20,
    paddingTop: theme.space.sm,
    paddingBottom: 20,
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
    gap: theme.space.sm,
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
    backgroundColor: theme.colors.card,
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
    backgroundColor: theme.colors.card,
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
    flexWrap: 'wrap',
    gap: theme.space.sm,
  },
  iconCell: {
    width: 52,
    height: 52,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.card,
    borderWidth: 2,
    borderColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  colorRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.space.md,
  },
  swatch: {
    width: 36,
    height: 36,
    borderRadius: 18,
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
    backgroundColor: theme.colors.card,
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
}));
