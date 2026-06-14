import { use$ } from '@legendapp/state/react';
import { SymbolView } from 'expo-symbols';
import { useState } from 'react';
import { Alert, Linking, Pressable, ScrollView, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';

import { diamondPath } from '@/lib/glyph';
import { haptics } from '@/lib/haptics';
import {
  FALLBACK_PRICE,
  inTrial,
  isAdmin,
  purchasePackage,
  restorePurchases,
  setProOverride,
  subscription$,
  trialDaysLeft,
} from '@/store';

// TODO: replace with your real hosted URLs (App Store requires both on the paywall).
const TERMS_URL = 'https://tucan.app/terms';
const PRIVACY_URL = 'https://tucan.app/privacy';

const DIAMOND = 56;

type Plan = 'annual' | 'monthly';

/**
 * The subscription paywall. Rendered full-screen as a hard gate once the free
 * trial ends, and also reachable voluntarily (dismissible) from Settings.
 */
export function Paywall({
  dismissible = false,
  onClose,
}: {
  dismissible?: boolean;
  onClose?: () => void;
}) {
  const { theme, rt } = useUnistyles();
  const [plan, setPlan] = useState<Plan>('annual');
  const [busy, setBusy] = useState(false);

  const annualPkg = use$(subscription$.annual);
  const monthlyPkg = use$(subscription$.monthly);
  const trialing = use$(() => inTrial());
  const daysLeft = use$(() => trialDaysLeft());
  const admin = use$(() => isAdmin());

  const annualPrice = annualPkg?.product.priceString ?? FALLBACK_PRICE.annual;
  const monthlyPrice = monthlyPkg?.product.priceString ?? FALLBACK_PRICE.monthly;

  async function onSubscribe() {
    if (busy) return;
    haptics.medium();
    const pkg = plan === 'annual' ? annualPkg : monthlyPkg;
    if (!pkg) {
      Alert.alert('Coming soon', 'Subscriptions aren’t available yet. Please try again later.');
      return;
    }
    setBusy(true);
    const ok = await purchasePackage(pkg);
    setBusy(false);
    if (ok) {
      haptics.success();
      onClose?.(); // entitlement is on → the gate opens on its own
    }
  }

  async function onRestore() {
    if (busy) return;
    haptics.light();
    setBusy(true);
    const ok = await restorePurchases();
    setBusy(false);
    if (ok) {
      haptics.success();
      onClose?.();
    } else {
      Alert.alert('Nothing to restore', 'We couldn’t find an active subscription on this account.');
    }
  }

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        bounces={false}>
        {dismissible && (
          <Pressable
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel="Close"
            onPress={() => {
              haptics.selection();
              onClose?.();
            }}
            style={({ pressed }) => [styles.close, pressed && styles.pressed]}>
            <SymbolView name="xmark" size={16} weight="semibold" tintColor={theme.colors.textSecondary} />
          </Pressable>
        )}

        <View style={styles.hero}>
          <Svg width={DIAMOND} height={DIAMOND}>
            <Path d={diamondPath(DIAMOND)} fill={theme.colors.ink} />
          </Svg>
          <Text style={styles.title}>Tucan Pro</Text>
          <Text style={styles.subtitle}>
            {trialing
              ? `${daysLeft} ${daysLeft === 1 ? 'day' : 'days'} left in your free trial. Keep going for good.`
              : 'Keep building your habits — unlimited tracking, colors, and every insight.'}
          </Text>
        </View>

        <View style={styles.plans}>
          <PlanCard
            selected={plan === 'annual'}
            onPress={() => {
              haptics.selection();
              setPlan('annual');
            }}
            title="Annual"
            price={annualPrice}
            period="/ year"
            note="Best value · save 58%"
          />
          <PlanCard
            selected={plan === 'monthly'}
            onPress={() => {
              haptics.selection();
              setPlan('monthly');
            }}
            title="Monthly"
            price={monthlyPrice}
            period="/ month"
          />
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Subscribe"
          disabled={busy}
          style={({ pressed }) => [styles.cta, (pressed || busy) && styles.ctaPressed]}
          onPress={onSubscribe}>
          <Text style={styles.ctaText}>{busy ? 'Please wait…' : 'Continue'}</Text>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Restore purchases"
          onPress={onRestore}
          style={({ pressed }) => [styles.restore, pressed && styles.pressed]}>
          <Text style={styles.restoreText}>Restore purchases</Text>
        </Pressable>

        <Text style={styles.legal}>
          Subscriptions renew automatically until cancelled. Cancel anytime in the App Store.{' '}
          <Text style={styles.link} onPress={() => void Linking.openURL(TERMS_URL)}>
            Terms
          </Text>{' '}
          ·{' '}
          <Text style={styles.link} onPress={() => void Linking.openURL(PRIVACY_URL)}>
            Privacy
          </Text>
        </Text>

        {admin && !dismissible && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Skip (admin)"
            onPress={() => {
              haptics.selection();
              setProOverride(true);
            }}
            style={({ pressed }) => [styles.skip, pressed && styles.pressed]}>
            <Text style={styles.skipText}>Skip for now (admin)</Text>
          </Pressable>
        )}
      </ScrollView>
      <View style={{ height: rt.insets.bottom }} />
    </View>
  );
}

function PlanCard({
  selected,
  onPress,
  title,
  price,
  period,
  note,
}: {
  selected: boolean;
  onPress: () => void;
  title: string;
  price: string;
  period: string;
  note?: string;
}) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      accessibilityLabel={`${title} ${price} ${period}`}
      onPress={onPress}
      style={[styles.plan, selected && styles.planSelected]}>
      <View style={styles.planHead}>
        <Text style={styles.planTitle}>{title}</Text>
        <View style={[styles.radio, selected && styles.radioOn]}>
          {selected && <View style={styles.radioDot} />}
        </View>
      </View>
      <View style={styles.priceRow}>
        <Text style={styles.price}>{price}</Text>
        <Text style={styles.period}>{period}</Text>
      </View>
      {note && <Text style={[styles.planNote, selected && styles.planNoteOn]}>{note}</Text>}
    </Pressable>
  );
}

const styles = StyleSheet.create((theme, rt) => ({
  screen: {
    flex: 1,
    backgroundColor: theme.colors.canvas,
  },
  content: {
    paddingHorizontal: theme.space.xl,
    paddingTop: rt.insets.top + theme.space.xxl,
    paddingBottom: theme.space.xl,
    gap: theme.space.xl,
  },
  close: {
    position: 'absolute',
    top: rt.insets.top + theme.space.sm,
    right: theme.space.lg,
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.card,
    zIndex: 1,
  },
  hero: {
    alignItems: 'center',
    gap: theme.space.md,
    paddingTop: theme.space.lg,
  },
  title: {
    fontSize: theme.font.title,
    fontWeight: theme.weight.bold,
    letterSpacing: -0.5,
    color: theme.colors.textPrimary,
  },
  subtitle: {
    fontSize: theme.font.body,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    paddingHorizontal: theme.space.md,
  },
  plans: {
    gap: theme.space.md,
  },
  plan: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.radius.lg,
    padding: theme.space.lg,
    gap: theme.space.xs,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  planSelected: {
    borderColor: theme.colors.ink,
  },
  planHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  planTitle: {
    fontSize: theme.font.heading,
    fontWeight: theme.weight.semibold,
    color: theme.colors.textPrimary,
  },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: theme.colors.separator,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioOn: {
    borderColor: theme.colors.ink,
  },
  radioDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: theme.colors.ink,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: theme.space.xs,
  },
  price: {
    fontSize: theme.font.title,
    fontWeight: theme.weight.heavy,
    letterSpacing: -0.5,
    color: theme.colors.textPrimary,
  },
  period: {
    fontSize: theme.font.body,
    color: theme.colors.textSecondary,
  },
  planNote: {
    fontSize: theme.font.caption,
    color: theme.colors.textSecondary,
  },
  planNoteOn: {
    color: theme.colors.textPrimary,
    fontWeight: theme.weight.medium,
  },
  cta: {
    height: 54,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaPressed: {
    opacity: 0.85,
  },
  ctaText: {
    fontSize: theme.font.body,
    fontWeight: theme.weight.semibold,
    color: theme.colors.canvas,
  },
  restore: {
    alignItems: 'center',
    paddingVertical: theme.space.xs,
  },
  restoreText: {
    fontSize: theme.font.body,
    color: theme.colors.textSecondary,
  },
  legal: {
    fontSize: theme.font.caption,
    color: theme.colors.textMuted,
    textAlign: 'center',
    lineHeight: 18,
  },
  link: {
    color: theme.colors.textSecondary,
    textDecorationLine: 'underline',
  },
  skip: {
    alignItems: 'center',
    paddingVertical: theme.space.sm,
  },
  skipText: {
    fontSize: theme.font.caption,
    color: theme.colors.textMuted,
  },
  pressed: {
    opacity: 0.7,
  },
}));
