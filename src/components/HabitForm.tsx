import DateTimePicker, {
  type DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import { useRouter } from 'expo-router';
import { SymbolView, type SFSymbol } from 'expo-symbols';
import { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';

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
  const [icon, setIcon] = useState<SFSymbol>(habitIcon(existing?.icon));
  const [color, setColor] = useState<string | null>(existing?.color ?? null);
  const [startDate, setStartDate] = useState<DateKey>(existing?.start_date ?? todayKey());
  const [activeDays, setActiveDays] = useState(existing?.active_days ?? ALL_DAYS);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [iconsExpanded, setIconsExpanded] = useState(false);

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
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.header}>
        <Pressable hitSlop={10} onPress={() => router.back()}>
          <Text style={styles.cancel}>Cancel</Text>
        </Pressable>
        <Text style={styles.headerTitle}>{isEdit ? 'Edit habit' : 'New habit'}</Text>
        <Pressable hitSlop={10} disabled={!canSave} onPress={onSave}>
          <Text style={[styles.save, !canSave && styles.saveDisabled]}>Save</Text>
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>
        {/* Name */}
        <Field label="Name">
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="e.g. Drink water"
            placeholderTextColor={theme.colors.textMuted}
            style={styles.input}
            autoFocus={!isEdit}
            returnKeyType="done"
          />
        </Field>

        {!isEdit && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            style={styles.suggestionsScroll}
            contentContainerStyle={styles.suggestions}>
            {HABIT_NAME_SUGGESTIONS.map((s) => (
              <Pressable
                key={s.name}
                style={({ pressed }) => [styles.chip, pressed && styles.pressed]}
                onPress={() => pickSuggestion(s)}>
                <SymbolView name={s.icon} size={15} tintColor={theme.colors.textSecondary} />
                <Text style={styles.chipText}>{s.name}</Text>
              </Pressable>
            ))}
          </ScrollView>
        )}

        {/* Description */}
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

        {/* Icon */}
        <Field label="Icon">
          <View style={styles.iconRow}>
            {(iconsExpanded
              ? HABIT_ICON_SUGGESTIONS
              : HABIT_ICON_SUGGESTIONS.slice(0, 9)
            ).map((opt) => {
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
              accessibilityLabel={iconsExpanded ? 'Show fewer icons' : 'Show more icons'}
              onPress={() => {
                haptics.selection();
                setIconsExpanded((e) => !e);
              }}
              style={styles.iconCell}>
              <SymbolView
                name={iconsExpanded ? 'chevron.up' : 'ellipsis'}
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
              display="inline"
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
      </ScrollView>
    </KeyboardAvoidingView>
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
  flex: {
    flex: 1,
    backgroundColor: theme.colors.canvas,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.space.lg,
    paddingTop: rt.insets.top + theme.space.sm,
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
  content: {
    paddingHorizontal: theme.space.lg,
    paddingBottom: rt.insets.bottom + theme.space.xxxl,
    gap: theme.space.xl,
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
  suggestionsScroll: {
    marginTop: -theme.space.md,
  },
  suggestions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.space.sm,
    paddingRight: theme.space.lg,
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
    borderColor: theme.colors.separator,
  },
  chipText: {
    fontSize: theme.font.caption,
    color: theme.colors.textSecondary,
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
