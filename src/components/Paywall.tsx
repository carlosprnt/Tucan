import { use$ } from '@legendapp/state/react';
import { SymbolView } from 'expo-symbols';
import { useEffect, useState } from 'react';
import { Alert, Image, Linking, Pressable, Text, useWindowDimensions, View } from 'react-native';
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
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

// Hosted on GitHub Pages from /docs (App Store requires both on the paywall).
const TERMS_URL = 'https://carlosprnt.github.io/Tucan/terms.html';
const PRIVACY_URL = 'https://carlosprnt.github.io/Tucan/privacy.html';

const APP_ICON = require('../../assets/images/icon-tucan.png');

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
  const { theme } = useUnistyles();
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
      <FallingGlyphs />

      <View style={styles.top}>
        {dismissible && (
          <View style={styles.header}>
            <Pressable
              hitSlop={12}
              accessibilityRole="button"
              accessibilityLabel="Close"
              onPress={() => {
                haptics.selection();
                onClose?.();
              }}
              style={({ pressed }) => [styles.close, pressed && styles.pressed]}>
              <SymbolView name="xmark" size={15} weight="semibold" tintColor={theme.colors.textSecondary} />
            </Pressable>
          </View>
        )}

        <View style={styles.hero}>
          <Image source={APP_ICON} style={styles.appIcon} />
          <Text style={styles.title}>Tucan Pro</Text>
          {trialing ? (
            <TrialLine days={daysLeft} />
          ) : (
            <Text style={styles.subtitle}>
              Your free trial has ended. Subscribe to keep tracking your habits.
            </Text>
          )}
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
            badge="Best value · save 58%"
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
      </View>

      <View style={styles.bottom}>
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
      </View>
    </View>
  );
}

// Trial countdown: bold count + muted "in your free trial".
function TrialLine({ days }: { days: number }) {
  return (
    <Text style={styles.trialLine}>
      <Text style={styles.trialDays}>
        {days} {days === 1 ? 'day' : 'days'} left{' '}
      </Text>
      <Text style={styles.trialMuted}>in your free trial</Text>
    </Text>
  );
}

// Faint gray diamonds drifting top → bottom behind the paywall content.
const FALLING = [
  { x: 0.08, size: 16, dur: 6200, delay: 0 },
  { x: 0.22, size: 24, dur: 7600, delay: 1800 },
  { x: 0.37, size: 14, dur: 5200, delay: 600 },
  { x: 0.5, size: 20, dur: 8000, delay: 2600 },
  { x: 0.63, size: 26, dur: 6800, delay: 1000 },
  { x: 0.78, size: 16, dur: 5600, delay: 3000 },
  { x: 0.9, size: 22, dur: 7200, delay: 400 },
  { x: 0.15, size: 18, dur: 6600, delay: 3400 },
  { x: 0.45, size: 14, dur: 5000, delay: 4200 },
  { x: 0.7, size: 18, dur: 7000, delay: 2200 },
  { x: 0.3, size: 20, dur: 7800, delay: 5000 },
  { x: 0.85, size: 14, dur: 5400, delay: 4600 },
];

function FallingGlyphs() {
  const { theme } = useUnistyles();
  const { width, height } = useWindowDimensions();
  return (
    <View pointerEvents="none" style={styles.falling}>
      {FALLING.map((g, i) => (
        <FallingGlyph
          key={i}
          left={g.x * width}
          size={g.size}
          duration={g.dur}
          delay={g.delay}
          screenH={height}
          color={theme.colors.dotMissed}
        />
      ))}
    </View>
  );
}

function FallingGlyph({
  left,
  size,
  duration,
  delay,
  screenH,
  color,
}: {
  left: number;
  size: number;
  duration: number;
  delay: number;
  screenH: number;
  color: string;
}) {
  const p = useSharedValue(0);

  useEffect(() => {
    p.value = withDelay(delay, withRepeat(withTiming(1, { duration, easing: Easing.linear }), -1, false));
  }, [p, delay, duration]);

  const travel = screenH + size * 2;
  const style = useAnimatedStyle(() => ({
    // Most visible as it enters at the top, fading to nothing as it falls.
    opacity: interpolate(p.value, [0, 0.12, 1], [0, 0.85, 0]),
    transform: [{ translateY: -size + p.value * travel }, { rotate: `${p.value * 90}deg` }],
  }));

  return (
    <Animated.View style={[styles.fallingGlyph, { left }, style]}>
      <Svg width={size} height={size}>
        <Path d={diamondPath(size)} fill={color} />
      </Svg>
    </Animated.View>
  );
}

function PlanCard({
  selected,
  onPress,
  title,
  price,
  period,
  badge,
}: {
  selected: boolean;
  onPress: () => void;
  title: string;
  price: string;
  period: string;
  badge?: string;
}) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      accessibilityLabel={`${title} ${price} ${period}`}
      onPress={onPress}
      style={[styles.plan, selected && styles.planSelected]}>
      {badge && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{badge}</Text>
        </View>
      )}
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
    </Pressable>
  );
}

const styles = StyleSheet.create((theme, rt) => ({
  screen: {
    flex: 1,
    backgroundColor: theme.colors.canvas,
    paddingHorizontal: theme.space.xl,
    paddingTop: rt.insets.top + theme.space.xs,
    paddingBottom: rt.insets.bottom + theme.space.lg,
    justifyContent: 'space-between',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  close: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.card,
  },
  falling: {
    position: 'absolute',
    top: 0,
    // Cancel the screen's horizontal padding so glyphs fall across the full width.
    left: -theme.space.xl,
    right: -theme.space.xl,
    bottom: 0,
  },
  fallingGlyph: {
    position: 'absolute',
    top: 0,
  },
  top: {
    gap: theme.space.lg,
  },
  hero: {
    alignItems: 'flex-start',
    gap: theme.space.md,
  },
  appIcon: {
    width: 72,
    height: 72,
    borderRadius: 16,
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
    textAlign: 'left',
  },
  // Trial countdown — right-aligned; bold count + muted "in your free trial".
  trialLine: {
    alignSelf: 'stretch',
    textAlign: 'left',
    marginTop: theme.space.xs,
  },
  trialDays: {
    fontSize: theme.font.heading,
    fontWeight: theme.weight.bold,
    color: theme.colors.textPrimary,
  },
  trialMuted: {
    fontSize: theme.font.heading,
    color: theme.colors.textSecondary,
  },
  plans: {
    gap: theme.space.md,
    marginTop: theme.space.xl,
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
  badge: {
    position: 'absolute',
    top: -11,
    left: theme.space.lg,
    backgroundColor: theme.colors.ink,
    paddingHorizontal: theme.space.sm,
    paddingVertical: 3,
    borderRadius: theme.radius.pill,
  },
  badgeText: {
    fontSize: theme.font.caption,
    fontWeight: theme.weight.semibold,
    color: theme.colors.card,
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
  bottom: {
    gap: theme.space.md,
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
