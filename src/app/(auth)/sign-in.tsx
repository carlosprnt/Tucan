import '@/theme/unistyles';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  Pressable,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { SymbolView } from 'expo-symbols';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  cancelAnimation,
  Easing,
  Extrapolation,
  FadeIn,
  FadeInDown,
  interpolate,
  interpolateColor,
  runOnJS,
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';

import { DotGrid } from '@/components/DotGrid';
import { HabitGlyph } from '@/components/HabitGlyph';
import { diamondPath } from '@/lib/glyph';
import type { DotState } from '@/lib/grid';
import { haptics } from '@/lib/haptics';
import { isAppleAuthAvailable, signInWithApple, signInWithGoogle } from '@/lib/oauth';

type Provider = 'google' | 'apple';

// Apple sign-in is gated until its Supabase provider is configured.
const APPLE_ENABLED = process.env.EXPO_PUBLIC_ENABLE_APPLE_AUTH === 'true';

// Hosted on GitHub Pages (same as the paywall links).
const TERMS_URL = 'https://carlosprnt.github.io/Tucan/terms.html';
const PRIVACY_URL = 'https://carlosprnt.github.io/Tucan/privacy.html';

// How long each story bullet fills before auto-advancing.
const STORY_MS = 4500;

type Hero = 'grid' | 'glyph' | 'dense' | 'login';

const STEPS: { key: Hero; title: string; subtitle: string }[] = [
  {
    key: 'grid',
    title: 'One dot a day',
    subtitle: 'Mark a habit done and watch the grid fill in.',
  },
  {
    key: 'glyph',
    title: 'Show up daily',
    subtitle: 'Every day you keep up becomes part of the picture.',
  },
  {
    key: 'dense',
    title: 'Progress, not pressure',
    subtitle: 'No streaks to break — just consistency you can see.',
  },
  {
    key: 'login',
    title: 'Free for 7 days',
    subtitle: 'Start building your habits — free for 7 days, then keep going with Pro.',
  },
];

// The last bullet shows the login options inline (no lift).
const LOGIN_INDEX = STEPS.length - 1;

/** Deterministic mix of dot states for the walkthrough grids. */
function heroGrid(cols: number, rows: number, seed: number): DotState[] {
  const states: DotState[] = [];
  let s = (seed + 1) * 9301 + 49297;
  for (let i = 0; i < cols * rows; i++) {
    s = (s * 9301 + 49297) % 233280;
    const r = s / 233280;
    states.push(r < 0.64 ? 'done' : r < 0.82 ? 'missed' : 'future');
  }
  return states;
}

export default function SignIn() {
  const { theme, rt } = useUnistyles();
  const { height: screenH } = useWindowDimensions();

  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [holding, setHolding] = useState(false);
  const [panelH, setPanelH] = useState(0);
  const [appleAvailable, setAppleAvailable] = useState(false);
  const [busy, setBusy] = useState<Provider | null>(null);

  const reveal = useSharedValue(0);

  const isLogin = index === LOGIN_INDEX;
  const paused = revealed || holding;

  // Stable so the per-bullet fill's timer effect doesn't restart on re-renders.
  const advance = useCallback(() => setIndex((i) => Math.min(i + 1, LOGIN_INDEX)), []);

  useEffect(() => {
    if (!APPLE_ENABLED) return;
    isAppleAuthAvailable().then(setAppleAvailable);
  }, []);

  // Lift the screen up into a rounded card whenever the tray is open.
  useEffect(() => {
    reveal.value = withTiming(revealed ? 1 : 0, {
      duration: 440,
      easing: Easing.out(Easing.cubic),
    });
  }, [revealed, reveal]);

  const liftStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: -panelH * reveal.value }],
  }));
  const cardRadius = theme.radius.xl;
  const screenStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 - 0.05 * reveal.value }],
    borderRadius: cardRadius * reveal.value,
    borderWidth: reveal.value,
  }));

  function goTo(target: number) {
    const t = Math.max(0, Math.min(LOGIN_INDEX, target));
    if (t === index) return;
    haptics.selection();
    setIndex(t);
  }

  function openLogin() {
    haptics.light();
    setRevealed(true);
  }

  function closeLogin() {
    haptics.selection();
    setRevealed(false);
  }

  // Horizontal swipe pages through the bullets; while the tray is up, a swipe
  // collapses it instead. Taps/buttons still work (activeOffsetX).
  const swipe = Gesture.Pan()
    .activeOffsetX([-20, 20])
    .onBegin(() => {
      'worklet';
      runOnJS(setHolding)(true); // hold-to-pause, like stories
    })
    .onEnd((e) => {
      'worklet';
      if (revealed) {
        if (e.translationX >= 50) runOnJS(setRevealed)(false);
        return;
      }
      if (e.translationX <= -50) runOnJS(goTo)(index + 1);
      else if (e.translationX >= 50) runOnJS(goTo)(index - 1);
    })
    .onFinalize(() => {
      'worklet';
      runOnJS(setHolding)(false); // finger lifted → resume
    });

  async function run(provider: Provider, fn: () => Promise<void>) {
    if (busy) return;
    haptics.light();
    setBusy(provider);
    try {
      await fn();
    } catch (e) {
      console.warn('Sign-in error', provider, e);
      Alert.alert('Couldn’t sign you in', 'Something went wrong. Please try again.');
    } finally {
      setBusy(null);
    }
  }

  const step = STEPS[index];

  // The sign-in options — rendered inline on the login bullet AND in the lift
  // tray below, so the same buttons serve both ways in.
  const loginBlock = (
    <>
      {appleAvailable && (
        <Animated.View entering={FadeInDown.duration(420).delay(60)}>
          <AuthButton
            label="Continue with Apple"
            icon={<AppleIcon color={theme.colors.textPrimary} />}
            busy={busy === 'apple'}
            disabled={busy !== null}
            onPress={() => run('apple', signInWithApple)}
          />
        </Animated.View>
      )}
      <Animated.View entering={FadeInDown.duration(420).delay(appleAvailable ? 150 : 60)}>
        <AuthButton
          label="Continue with Google"
          icon={<GoogleIcon />}
          busy={busy === 'google'}
          disabled={busy !== null}
          onPress={() => run('google', signInWithGoogle)}
        />
      </Animated.View>
      <Animated.View entering={FadeInDown.duration(420).delay(appleAvailable ? 240 : 150)}>
        <Text style={styles.legal}>
          By continuing you agree to our{' '}
          <Text style={styles.legalLink} onPress={() => void Linking.openURL(TERMS_URL)}>
            Terms
          </Text>{' '}
          &amp;{' '}
          <Text style={styles.legalLink} onPress={() => void Linking.openURL(PRIVACY_URL)}>
            Privacy
          </Text>
          .
        </Text>
      </Animated.View>
    </>
  );

  return (
    <View style={styles.container}>
      <GestureDetector gesture={swipe}>
        <Animated.View style={[styles.lift, liftStyle]}>
          {/* The on-boarding screen (full viewport height) */}
          <Animated.View style={[styles.screen, { height: screenH }, screenStyle]}>
            {/* Story progress bars (the last one is static, so it's half width) */}
            <View style={[styles.segments, { paddingTop: rt.insets.top + theme.space.md }]}>
              {STEPS.map((s, i) => {
                // The last bullet, once reached, becomes a diamond as the stars fly.
                if (i === LOGIN_INDEX && isLogin) {
                  return <LoginMark key={s.key} />;
                }
                return (
                  <View key={s.key} style={[styles.track, i === LOGIN_INDEX && styles.trackShort]}>
                    {i < index && <View style={styles.fillFull} />}
                    {i === index && <StoryFill paused={paused} onComplete={advance} />}
                  </View>
                );
              })}
            </View>

            {/* Success burst from the final (login) bullet */}
            {isLogin && <StarBurst />}

            {/* Active slide (crossfade between bullets) */}
            <View style={styles.slideArea}>
              <Animated.View key={index} entering={FadeIn.duration(380)} style={styles.slide}>
                <Text style={styles.title}>{step.title}</Text>
                <Text style={styles.subtitle}>{step.subtitle}</Text>
                <View
                  style={[
                    styles.card,
                    (step.key === 'glyph' || step.key === 'dense') && styles.cardPreview,
                    step.key === 'login' && styles.cardClip,
                  ]}>
                  {step.key === 'grid' ? (
                    <FillGrid />
                  ) : step.key === 'glyph' ? (
                    <HabitPreview />
                  ) : step.key === 'dense' ? (
                    <OverviewPreview />
                  ) : step.key === 'login' ? (
                    <LoginPreview />
                  ) : (
                    <SlideHero hero={step.key} />
                  )}
                </View>
              </Animated.View>
            </View>

            {/* Footer: login options inline on the last bullet, else the actions */}
            <View
              style={[
                styles.footer,
                { paddingBottom: rt.insets.bottom + (isLogin ? theme.space.lg : theme.space.sm) },
              ]}>
              {isLogin ? (
                loginBlock
              ) : (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Log in"
                  disabled={revealed}
                  style={({ pressed }) => [
                    styles.primary,
                    revealed && styles.primaryDisabled,
                    pressed && styles.pressed,
                  ]}
                  onPress={openLogin}>
                  <Text style={[styles.primaryText, revealed && styles.primaryTextDisabled]}>Log in</Text>
                </Pressable>
              )}
            </View>

            {/* Invisible tap-to-collapse layer, only while the tray is up */}
            {revealed && (
              <Pressable style={styles.tapCatcher} onPress={closeLogin} accessibilityLabel="Dismiss" />
            )}
          </Animated.View>

          {/* Lift tray, sitting just below the screen until revealed by Log in */}
          <View
            style={[styles.tray, { paddingBottom: rt.insets.bottom + theme.space.xl }]}
            onLayout={(e) => setPanelH(e.nativeEvent.layout.height)}>
            {loginBlock}
          </View>
        </Animated.View>
      </GestureDetector>
    </View>
  );
}

// The active bullet's fill. Owns its own value so it always starts empty (gray)
// and auto-completes — mounting fresh per bullet avoids the previous-bullet's
// full value flashing in for a frame. Pausing banks elapsed time; resume continues.
function StoryFill({ paused, onComplete }: { paused: boolean; onComplete: () => void }) {
  const fill = useSharedValue(0);
  const elapsed = useRef(0);
  const startedAt = useRef(0);
  const running = useRef(false);

  useEffect(() => {
    if (paused) {
      if (running.current) {
        elapsed.current += Date.now() - startedAt.current;
        running.current = false;
        cancelAnimation(fill);
      }
      return;
    }
    running.current = true;
    startedAt.current = Date.now();
    const remaining = Math.max(0, STORY_MS - elapsed.current);
    fill.value = withTiming(1, { duration: remaining, easing: Easing.linear }, (finished) => {
      'worklet';
      if (finished) runOnJS(onComplete)();
    });
    return () => cancelAnimation(fill);
  }, [paused, fill, onComplete]);

  const style = useAnimatedStyle(() => ({ width: `${fill.value * 100}%` }));
  return <Animated.View style={[styles.fillFull, style]} />;
}

// The last progress segment, transformed into a diamond that pops in while the
// bars ease open a little margin around it (morph, not an instant jump).
const MARK_MARGIN = 12;

function LoginMark() {
  const { theme } = useUnistyles();
  const s = useSharedValue(0);

  useEffect(() => {
    s.value = withSpring(1, { damping: 13, stiffness: 170 });
  }, [s]);

  const style = useAnimatedStyle(() => ({
    marginLeft: s.value * MARK_MARGIN,
    transform: [{ scale: s.value }, { rotate: `${(1 - s.value) * -120}deg` }],
  }));

  const size = 14;
  return (
    <Animated.View style={[styles.markWrap, style]}>
      <Svg width={size} height={size}>
        <Path d={diamondPath(size)} fill={theme.colors.ink} />
      </Svg>
    </Animated.View>
  );
}

function AuthButton({
  label,
  icon,
  busy,
  disabled,
  onPress,
}: {
  label: string;
  icon: React.ReactNode;
  busy: boolean;
  disabled: boolean;
  onPress: () => void;
}) {
  const { theme } = useUnistyles();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={disabled}
      style={({ pressed }) => [styles.authBtn, pressed && styles.pressed]}
      onPress={onPress}>
      {busy ? (
        <ActivityIndicator color={theme.colors.textPrimary} />
      ) : (
        <>
          <View style={styles.authIcon}>{icon}</View>
          <Text style={styles.authLabel}>{label}</Text>
        </>
      )}
    </Pressable>
  );
}

function AppleIcon({ color }: { color: string }) {
  return (
    <Svg width={19} height={19} viewBox="0 0 24 24">
      <Path
        fill={color}
        d="M16.365 1.43c0 1.14-.493 2.27-1.177 3.08-.744.9-1.99 1.57-2.987 1.57-.12 0-.23-.02-.3-.03-.01-.06-.04-.22-.04-.39 0-1.15.572-2.27 1.206-2.98.804-.94 2.142-1.64 3.248-1.68.03.13.05.28.05.43zm4.565 15.71c-.03.07-.463 1.58-1.518 3.12-.945 1.34-1.94 2.71-3.43 2.71-1.517 0-1.9-.88-3.63-.88-1.698 0-2.302.91-3.67.91-1.377 0-2.332-1.26-3.428-2.8-1.287-1.82-2.323-4.63-2.323-7.28 0-4.28 2.797-6.55 5.552-6.55 1.448 0 2.675.95 3.6.95.865 0 2.222-1.01 3.902-1.01.613 0 2.886.06 4.374 2.19-.13.09-2.383 1.37-2.383 4.19 0 3.26 2.854 4.42 2.955 4.45z"
      />
    </Svg>
  );
}

function GoogleIcon() {
  return (
    <Svg width={18} height={18} viewBox="0 0 48 48">
      <Path
        fill="#FFC107"
        d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"
      />
      <Path
        fill="#FF3D00"
        d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z"
      />
      <Path
        fill="#4CAF50"
        d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238C29.211 35.091 26.715 36 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z"
      />
      <Path
        fill="#1976D2"
        d="M43.611 20.083H42V20H24v8h11.303c-.792 2.237-2.231 4.166-4.087 5.571l6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z"
      />
    </Svg>
  );
}

// A little black 5-point star, fired off the last bullet as a success cue.
const STAR_COUNT = 8;
const STAR_PATH =
  'M12 .587l3.668 7.431 8.2 1.192-5.934 5.787 1.401 8.169L12 18.896l-7.335 3.863 1.401-8.169L.132 9.21l8.2-1.192z';

function StarBurst() {
  const { rt, theme } = useUnistyles();
  return (
    <View
      pointerEvents="none"
      style={[styles.burst, { top: rt.insets.top + theme.space.md, right: theme.space.xl }]}>
      {Array.from({ length: STAR_COUNT }).map((_, i) => (
        <Star key={i} i={i} />
      ))}
    </View>
  );
}

function Star({ i }: { i: number }) {
  const { theme } = useUnistyles();
  const p = useSharedValue(0);

  useEffect(() => {
    p.value = withTiming(1, { duration: 480, easing: Easing.out(Easing.cubic) });
  }, [p]);

  const angle = -Math.PI / 2 + (i / STAR_COUNT) * Math.PI * 2;
  const dist = 34 + (i % 3) * 14;
  const dx = Math.cos(angle) * dist;
  const dy = Math.sin(angle) * dist;
  const size = 9 + (i % 3) * 3;

  const style = useAnimatedStyle(() => ({
    opacity: 1 - p.value,
    transform: [
      { translateX: dx * p.value },
      { translateY: dy * p.value },
      { scale: 0.3 + p.value },
      { rotate: `${p.value * 120}deg` },
    ],
  }));

  return (
    <Animated.View style={[styles.star, style]}>
      <Svg width={size} height={size} viewBox="0 0 24 24">
        <Path d={STAR_PATH} fill={theme.colors.ink} />
      </Svg>
    </Animated.View>
  );
}

const AnimatedPath = Animated.createAnimatedComponent(Path);

/**
 * First bullet: the white card fills with glyphs in reading order (left→right,
 * top→bottom) — first as gray, then each turns black — as if a real habit is
 * being lived in. One shared `progress` drives the whole sweep on the UI thread.
 */
function FillGrid() {
  const [size, setSize] = useState({ w: 0, h: 0 });
  return (
    <View
      style={styles.fillWrap}
      onLayout={(e) => setSize({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}>
      {size.w > 0 && size.h > 0 && <FillSvg width={size.w} height={size.h} />}
    </View>
  );
}

function FillSvg({ width, height }: { width: number; height: number }) {
  const { theme } = useUnistyles();
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withTiming(1, { duration: 2800, easing: Easing.linear });
  }, [progress]);

  const GAP = 8;
  const TARGET = 26; // controls how many glyphs (cells) fit
  const cols = Math.max(1, Math.floor((width + GAP) / (TARGET + GAP)));
  const cell = (width - (cols - 1) * GAP) / cols;
  const rows = Math.max(1, Math.floor((height + GAP) / (cell + GAP)));
  const total = cols * rows;
  // Draw each glyph at 70% of its cell (30% smaller), centered, for more air.
  const glyph = cell * 0.7;
  const inset = (cell - glyph) / 2;
  const path = diamondPath(glyph);
  const gridW = cols * cell + (cols - 1) * GAP;
  const gridH = rows * cell + (rows - 1) * GAP;

  return (
    <Svg width={gridW} height={gridH}>
      {Array.from({ length: total }).map((_, i) => {
        const col = i % cols;
        const row = Math.floor(i / cols);
        const order = total > 1 ? i / (total - 1) : 0;
        return (
          <FillCell
            key={i}
            d={path}
            x={col * (cell + GAP) + inset}
            y={row * (cell + GAP) + inset}
            order={order}
            progress={progress}
            gray={theme.colors.dotMissed}
            ink={theme.colors.dotDone}
          />
        );
      })}
    </Svg>
  );
}

function FillCell({
  d,
  x,
  y,
  order,
  progress,
  gray,
  ink,
}: {
  d: string;
  x: number;
  y: number;
  order: number;
  progress: { value: number };
  gray: string;
  ink: string;
}) {
  const animatedProps = useAnimatedProps(() => {
    const reveal = order * 0.5; // gray glyphs fade in, in reading order
    const blacken = 0.5 + order * 0.45; // then each turns black, same order
    return {
      opacity: interpolate(progress.value, [reveal, reveal + 0.05], [0, 1], Extrapolation.CLAMP),
      fill: interpolateColor(progress.value, [blacken, blacken + 0.07], [gray, ink]),
    };
  });
  return <AnimatedPath d={d} transform={`translate(${x}, ${y})`} animatedProps={animatedProps} />;
}

// Second bullet: clean white habit cards rise in from below, one after another,
// each ticking its check as it lands — a little slice of the real app.
const PREVIEW_CARDS = [
  { icon: 'drop.fill', name: 'Drink water', total: 48 },
  { icon: 'book.fill', name: 'Read', total: 22 },
  { icon: 'figure.run', name: 'Exercise', total: 16 },
  { icon: 'moon.fill', name: 'Sleep early', total: 31 },
  { icon: 'brain.head.profile', name: 'Meditate', total: 12 },
  { icon: 'leaf.fill', name: 'Stretch', total: 9 },
  { icon: 'fork.knife', name: 'Cook at home', total: 14 },
  { icon: 'pencil', name: 'Journal', total: 27 },
  { icon: 'bed.double.fill', name: 'No phone in bed', total: 6 },
];

function HabitPreview() {
  const n = PREVIEW_CARDS.length;
  return (
    <View style={styles.pvWrap}>
      {PREVIEW_CARDS.map((c, i) => (
        <PreviewCard
          key={c.name}
          {...c}
          delay={100 + i * 150}
          opacity={1 - (i / (n - 1)) * 0.85}
          checked={i === 0 || i === 2}
        />
      ))}
    </View>
  );
}

function PreviewCard({
  icon,
  name,
  total,
  delay,
  opacity,
  checked,
}: {
  icon: string;
  name: string;
  total: number;
  delay: number;
  opacity: number;
  checked: boolean;
}) {
  const { theme } = useUnistyles();
  const enter = useSharedValue(0);

  useEffect(() => {
    enter.value = withDelay(delay, withTiming(1, { duration: 460, easing: Easing.out(Easing.cubic) }));
  }, [enter, delay]);

  // Rises in from below; rests at a lower opacity the further down it sits.
  const style = useAnimatedStyle(() => ({
    opacity: enter.value * opacity,
    transform: [{ translateY: (1 - enter.value) * 22 }],
  }));

  return (
    <Animated.View style={[styles.pvCard, style]}>
      <View style={styles.pvTop}>
        <View style={styles.pvIcon}>
          <HabitGlyph icon={icon} size={20} color={theme.colors.ink} />
        </View>
        <View style={styles.pvInfo}>
          <Text style={styles.pvName} numberOfLines={1}>
            {name}
          </Text>
          <Text style={styles.pvTotal}>{total}</Text>
        </View>
        <PreviewCheck delay={delay + 300} checked={checked} />
      </View>
    </Animated.View>
  );
}

/** The card's check — only the marked ones animate in; the rest stay empty. */
function PreviewCheck({ delay, checked }: { delay: number; checked: boolean }) {
  const { theme } = useUnistyles();
  const m = useSharedValue(0);

  useEffect(() => {
    if (checked) m.value = withDelay(delay, withSpring(1, { damping: 18, stiffness: 260 }));
  }, [m, delay, checked]);

  const circleStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(m.value, [0, 1], ['rgba(0,0,0,0)', theme.colors.ink]),
    borderColor: interpolateColor(m.value, [0, 1], [theme.colors.dotMissed, theme.colors.ink]),
  }));
  const checkStyle = useAnimatedStyle(() => ({
    opacity: m.value,
    transform: [{ scale: m.value }],
  }));

  return (
    <Animated.View style={[styles.pvCircle, circleStyle]}>
      <Animated.View style={checkStyle}>
        <SymbolView name="checkmark" size={16} weight="bold" tintColor={theme.colors.canvas} />
      </Animated.View>
    </Animated.View>
  );
}

// Third bullet: a slice of the Overview — stats fading in, then a week of
// glyphs loading across the days, so "consistency you can see" lands literally.
const OV_STATS = [
  { label: 'Completed this month', value: '23' },
  { label: 'Completed all-time', value: '412' },
  { label: 'Consistency', value: '86%' },
];

const WEEK_LETTERS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

// name, days in month, weekday (0 = Mon) the 1st falls on, and a pattern seed.
const MONTHS = [
  { name: 'June', days: 30, offset: 6, seed: 2 },
  { name: 'May', days: 31, offset: 3, seed: 5 },
  { name: 'April', days: 30, offset: 1, seed: 8 },
];

function monthStates(days: number, seed: number): boolean[] {
  const out: boolean[] = [];
  let s = (seed + 1) * 9301 + 49297;
  for (let i = 0; i < days; i++) {
    s = (s * 9301 + 49297) % 233280;
    out.push(s / 233280 < 0.7); // true = done (ink), false = not done (gray)
  }
  return out;
}

// Small glyphs (like the first bullet); columns still span the full width.
const OV_GLYPH = 19;

function OverviewPreview() {
  const [w, setW] = useState(0);
  const statsEnd = 120 + OV_STATS.length * 120;
  return (
    <View style={styles.ovWrap}>
      <View style={styles.ovStats}>
        {OV_STATS.map((s, i) => (
          <StatRow key={s.label} label={s.label} value={s.value} delay={120 + i * 120} />
        ))}
      </View>
      <View style={styles.ovMonths} onLayout={(e) => setW(e.nativeEvent.layout.width)}>
        {w > 0 &&
          MONTHS.map((m, i) => (
            <MonthBlock key={m.name} {...m} width={w} baseDelay={statsEnd + 120 + i * 520} />
          ))}
      </View>
    </View>
  );
}

function StatRow({ label, value, delay }: { label: string; value: string; delay: number }) {
  return (
    <Animated.View entering={FadeInDown.duration(360).delay(delay)} style={styles.ovRow}>
      <Text style={styles.ovLabel}>{label}</Text>
      <Text style={styles.ovValue}>{value}</Text>
    </Animated.View>
  );
}

function MonthBlock({
  name,
  days,
  offset,
  seed,
  width,
  baseDelay,
}: {
  name: string;
  days: number;
  offset: number;
  seed: number;
  width: number;
  baseDelay: number;
}) {
  const { theme } = useUnistyles();
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withDelay(
      baseDelay + 160,
      withTiming(1, { duration: 700, easing: Easing.out(Easing.cubic) }),
    );
  }, [progress, baseDelay]);

  const slot = width / 7; // full-width columns; the glyph sits small inside each
  const inset = (slot - OV_GLYPH) / 2;
  const rows = Math.ceil((offset + days) / 7);
  const path = diamondPath(OV_GLYPH);
  const states = monthStates(days, seed);

  return (
    <View style={styles.monthBlock}>
      <Animated.Text entering={FadeInDown.duration(360).delay(baseDelay)} style={styles.monthName}>
        {name}
      </Animated.Text>
      <Animated.View entering={FadeInDown.duration(360).delay(baseDelay + 80)} style={styles.weekRow}>
        {WEEK_LETTERS.map((l, i) => (
          <Text key={i} style={[styles.weekLabel, { width: slot }]}>
            {l}
          </Text>
        ))}
      </Animated.View>
      <Svg width={width} height={rows * slot}>
        {Array.from({ length: days }).map((_, di) => {
          const idx = offset + di;
          const col = idx % 7;
          const row = Math.floor(idx / 7);
          return (
            <MonthCell
              key={di}
              d={path}
              x={col * slot + inset}
              y={row * slot + inset}
              order={di / days}
              progress={progress}
              color={states[di] ? theme.colors.dotDone : theme.colors.dotMissed}
            />
          );
        })}
      </Svg>
    </View>
  );
}

function MonthCell({
  d,
  x,
  y,
  order,
  progress,
  color,
}: {
  d: string;
  x: number;
  y: number;
  order: number;
  progress: { value: number };
  color: string;
}) {
  const animatedProps = useAnimatedProps(() => ({
    opacity: interpolate(progress.value, [order * 0.85, order * 0.85 + 0.1], [0, 1], Extrapolation.CLAMP),
  }));
  return <AnimatedPath d={d} transform={`translate(${x}, ${y})`} fill={color} animatedProps={animatedProps} />;
}

// Last bullet: a habit card rises in from below and its grid fills top→bottom,
// painting the "you've been using Tucan" moment.
function LoginPreview() {
  const { theme } = useUnistyles();
  const [size, setSize] = useState({ w: 0, h: 0 });
  const enter = useSharedValue(0);

  useEffect(() => {
    enter.value = withTiming(1, { duration: 520, easing: Easing.out(Easing.cubic) });
  }, [enter]);

  const style = useAnimatedStyle(() => ({
    opacity: enter.value,
    transform: [{ translateY: (1 - enter.value) * 64 }],
  }));

  return (
    <Animated.View style={[styles.loginCard, style]}>
      <View style={styles.loginTop}>
        <View style={styles.loginIcon}>
          <SymbolView name="face.smiling.fill" size={24} tintColor={theme.colors.ink} />
        </View>
        <View style={styles.loginInfo}>
          <Text style={styles.loginName}>Using Tucan</Text>
          <Text style={styles.loginTotal}>85 days</Text>
        </View>
      </View>
      <View
        style={styles.loginGrid}
        onLayout={(e) => setSize({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}>
        {size.w > 0 && size.h > 0 && <LoginGrid width={size.w} height={size.h} />}
      </View>
    </Animated.View>
  );
}

// Like the first bullet's fill, but a few days stay unused (gray): the first
// couple of days, day 7, and day 18 — the rest fill in.
function loginMissed(i: number): boolean {
  return i < 2 || i === 6 || i === 17;
}

function LoginGrid({ width, height }: { width: number; height: number }) {
  const { theme } = useUnistyles();
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withTiming(1, { duration: 2800, easing: Easing.linear });
  }, [progress]);

  const GAP = 8;
  const TARGET = 26;
  const cols = Math.max(1, Math.floor((width + GAP) / (TARGET + GAP)));
  const cell = (width - (cols - 1) * GAP) / cols;
  const rows = Math.max(1, Math.floor((height + GAP) / (cell + GAP)));
  const total = cols * rows;
  const glyph = cell * 0.7;
  const inset = (cell - glyph) / 2;
  const path = diamondPath(glyph);
  const gridW = cols * cell + (cols - 1) * GAP;
  const gridH = rows * cell + (rows - 1) * GAP;

  return (
    <Svg width={gridW} height={gridH}>
      {Array.from({ length: total }).map((_, i) => {
        const col = i % cols;
        const row = Math.floor(i / cols);
        const order = total > 1 ? i / (total - 1) : 0;
        const done = !loginMissed(i);
        return (
          <FillCell
            key={i}
            d={path}
            x={col * (cell + GAP) + inset}
            y={row * (cell + GAP) + inset}
            order={order}
            progress={progress}
            gray={theme.colors.dotMissed}
            ink={done ? theme.colors.dotDone : theme.colors.dotMissed}
          />
        );
      })}
    </Svg>
  );
}

function SlideHero({ hero }: { hero: Hero }) {
  const { theme } = useUnistyles();
  if (hero === 'glyph' || hero === 'login') {
    const size = hero === 'glyph' ? 132 : 104;
    return (
      <Svg width={size} height={size}>
        <Path d={diamondPath(size)} fill={theme.colors.ink} />
      </Svg>
    );
  }
  const cols = hero === 'dense' ? 8 : 6;
  const rows = hero === 'dense' ? 5 : 4;
  const cell = hero === 'dense' ? 16 : 22;
  return (
    <DotGrid states={heroGrid(cols, rows, hero === 'dense' ? 7 : 3)} columns={cols} cellSize={cell} gap={10} />
  );
}

const styles = StyleSheet.create((theme, rt) => ({
  container: {
    flex: 1,
    backgroundColor: theme.colors.canvas,
    overflow: 'hidden',
  },
  lift: {
    flex: 1,
  },
  screen: {
    width: '100%',
    backgroundColor: theme.colors.canvas,
    borderColor: theme.colors.separator,
    overflow: 'hidden',
  },
  segments: {
    flexDirection: 'row',
    gap: theme.space.xs,
    paddingHorizontal: theme.space.xl,
  },
  track: {
    flex: 1,
    height: 3,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.separator,
    overflow: 'hidden',
  },
  trackShort: {
    flex: 0,
    width: 8,
  },
  // Holds the diamond that the last bullet becomes; keeps the row 3px tall while
  // the glyph overflows above/below (no layout shift on reaching the login step).
  markWrap: {
    width: 8,
    height: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  burst: {
    position: 'absolute',
    width: 0,
    height: 0,
  },
  star: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
  fillFull: {
    height: '100%',
    width: '100%',
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.ink,
  },
  slideArea: {
    flex: 1,
  },
  slide: {
    flex: 1,
    paddingHorizontal: theme.space.xl,
    paddingTop: theme.space.xxl,
    gap: theme.space.sm,
  },
  title: {
    fontSize: theme.font.title,
    fontWeight: theme.weight.bold,
    letterSpacing: -0.5,
    color: theme.colors.textPrimary,
  },
  subtitle: {
    fontSize: theme.font.heading,
    fontWeight: theme.weight.regular,
    color: theme.colors.textSecondary,
  },
  card: {
    flex: 1,
    marginTop: theme.space.lg,
    marginBottom: theme.space.lg,
    borderRadius: theme.radius.xl,
    backgroundColor: theme.colors.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fillWrap: {
    flex: 1,
    alignSelf: 'stretch',
    margin: theme.space.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Clips the login card so it (and its grid) appear to keep going below the fold.
  cardClip: {
    justifyContent: 'flex-start',
    overflow: 'hidden',
  },
  loginCard: {
    // Taller than the visible area on purpose — the container clips the bottom,
    // so the card and its glyphs read as continuing past the white container.
    height: 800,
    alignSelf: 'stretch',
    marginHorizontal: theme.space.lg,
    marginTop: theme.space.lg,
    backgroundColor: theme.colors.card,
    borderRadius: theme.radius.xl,
    padding: theme.space.lg,
    gap: theme.space.md,
    borderWidth: 1,
    borderColor: theme.colors.separator,
  },
  loginTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.space.md,
  },
  loginIcon: {
    width: 40,
    height: 40,
    borderRadius: theme.radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.canvas,
  },
  loginInfo: {
    flex: 1,
    gap: 2,
  },
  loginName: {
    fontSize: theme.font.heading,
    fontWeight: theme.weight.semibold,
    color: theme.colors.textPrimary,
  },
  loginTotal: {
    fontSize: theme.font.caption,
    color: theme.colors.textSecondary,
  },
  loginGrid: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardPreview: {
    justifyContent: 'flex-start',
    overflow: 'hidden',
    paddingTop: theme.space.lg,
  },
  pvWrap: {
    alignSelf: 'stretch',
    paddingHorizontal: theme.space.lg,
    gap: theme.space.md,
  },
  pvCard: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.radius.lg,
    paddingHorizontal: theme.space.lg,
    paddingVertical: theme.space.lg,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
  },
  pvTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.space.md,
  },
  pvIcon: {
    width: 42,
    height: 42,
    borderRadius: theme.radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.canvas,
  },
  pvInfo: {
    flex: 1,
    gap: 1,
  },
  pvName: {
    fontSize: theme.font.body,
    fontWeight: theme.weight.semibold,
    color: theme.colors.textPrimary,
  },
  pvTotal: {
    fontSize: theme.font.caption,
    fontWeight: theme.weight.medium,
    color: theme.colors.textSecondary,
  },
  pvCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 2,
    borderColor: theme.colors.dotMissed,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ovWrap: {
    alignSelf: 'stretch',
    paddingHorizontal: theme.space.lg,
    gap: theme.space.xl,
  },
  ovStats: {
    gap: theme.space.md,
  },
  ovRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: theme.space.md,
  },
  ovLabel: {
    fontSize: theme.font.body,
    color: theme.colors.textSecondary,
    flexShrink: 1,
  },
  ovValue: {
    fontSize: theme.font.body,
    fontWeight: theme.weight.semibold,
    color: theme.colors.textPrimary,
  },
  ovMonths: {
    alignSelf: 'stretch',
    gap: theme.space.lg,
  },
  monthBlock: {
    alignSelf: 'stretch',
    gap: theme.space.sm,
  },
  monthName: {
    fontSize: theme.font.body,
    fontWeight: theme.weight.semibold,
    color: theme.colors.textPrimary,
  },
  weekRow: {
    flexDirection: 'row',
  },
  weekLabel: {
    fontSize: theme.font.caption,
    color: theme.colors.textMuted,
    textAlign: 'center',
  },
  footer: {
    paddingHorizontal: theme.space.xl,
    gap: theme.space.md,
  },
  primary: {
    height: 54,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryText: {
    fontSize: theme.font.body,
    fontWeight: theme.weight.semibold,
    color: theme.colors.card,
  },
  primaryDisabled: {
    backgroundColor: theme.colors.separator,
  },
  primaryTextDisabled: {
    color: theme.colors.textMuted,
  },
  tapCatcher: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  tray: {
    width: '100%',
    backgroundColor: theme.colors.canvas,
    paddingHorizontal: theme.space.xl,
    paddingTop: theme.space.xl,
    gap: theme.space.md,
  },
  authBtn: {
    height: 54,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.card,
    borderWidth: 1,
    borderColor: theme.colors.separator,
    alignItems: 'center',
    justifyContent: 'center',
  },
  authIcon: {
    position: 'absolute',
    left: theme.space.lg,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
  },
  authLabel: {
    fontSize: theme.font.body,
    fontWeight: theme.weight.semibold,
    color: theme.colors.textPrimary,
  },
  legal: {
    fontSize: theme.font.caption,
    color: theme.colors.textMuted,
    textAlign: 'center',
    marginTop: theme.space.xs,
  },
  legalLink: {
    color: theme.colors.textSecondary,
    textDecorationLine: 'underline',
  },
  pressed: {
    opacity: 0.85,
  },
}));
