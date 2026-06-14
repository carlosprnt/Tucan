import { observable } from '@legendapp/state';
import { NativeModules } from 'react-native';
import type { CustomerInfo, LOG_LEVEL, PurchasesPackage } from 'react-native-purchases';

import { storage } from '@/lib/mmkv';
import { PREVIEW } from '@/lib/preview';

import { admin$ } from './demo';
import { currentProfile } from './profile$';

/** RevenueCat entitlement that unlocks the app. Configure this id in RevenueCat. */
const ENTITLEMENT = 'pro';

/** Days of free, no-card trial measured from the account's creation. */
export const TRIAL_DAYS = 7;

/** Shown on the paywall if RevenueCat offerings aren't loaded yet. */
export const FALLBACK_PRICE = { annual: '€9.99', monthly: '€1.99' } as const;

/**
 * Subscription state, fed by RevenueCat. `active` = the `pro` entitlement is on
 * (subscribed). `annual`/`monthly` are the purchasable packages for the paywall.
 */
export const subscription$ = observable<{
  active: boolean;
  ready: boolean;
  annual: PurchasesPackage | null;
  monthly: PurchasesPackage | null;
}>({ active: false, ready: false, annual: null, monthly: null });

export function isSubscribed(): boolean {
  return subscription$.active.get();
}

// --- Free trial (app-level, from profiles.created_at) -----------------------

function trialEndMs(): number | null {
  const created = currentProfile()?.created_at;
  if (!created) return null;
  const t = new Date(created).getTime();
  if (Number.isNaN(t)) return null;
  return t + TRIAL_DAYS * 24 * 60 * 60 * 1000;
}

export function inTrial(): boolean {
  const end = trialEndMs();
  if (end == null) return true; // profile not loaded yet — don't lock prematurely
  return Date.now() < end;
}

export function trialDaysLeft(): number {
  const end = trialEndMs();
  if (end == null) return TRIAL_DAYS;
  return Math.max(0, Math.ceil((end - Date.now()) / (24 * 60 * 60 * 1000)));
}

/**
 * Whether the user can use the app and its features. Pay-to-use after the trial.
 * The admin Pro override forces it on/off for testing (true/false), or null to
 * follow the real subscription + trial.
 */
export function hasPro(): boolean {
  if (PREVIEW) return true;
  const override = admin$.proOverride.get();
  if (override != null) return override;
  return isSubscribed() || inTrial();
}

/** Alias for `hasPro` — whether the user may keep using the app (pay-to-use). */
export const isPremium = hasPro;

// --- One-time "free trial" intro paywall ------------------------------------

const TRIAL_INTRO_KEY = 'paywall.trialIntroSeen';

export function hasSeenTrialIntro(): boolean {
  return storage.getString(TRIAL_INTRO_KEY) === '1';
}

export function markTrialIntroSeen(): void {
  storage.set(TRIAL_INTRO_KEY, '1');
}

/**
 * Whether to surface the "7 days free, then paid" intro paywall — shown once,
 * the first time a brand-new user checks off a habit. Never to subscribers,
 * admins (override), or in preview.
 */
export function shouldShowTrialIntro(): boolean {
  if (PREVIEW) return false;
  if (hasSeenTrialIntro()) return false;
  if (admin$.proOverride.get() != null) return false;
  if (isSubscribed()) return false;
  return inTrial();
}

// --- RevenueCat wiring ------------------------------------------------------

// Load the native SDK lazily and defensively: a JS bundle running on a build
// that doesn't include the native module yet (e.g. before the next rebuild)
// must never crash. If it can't load, the app falls back to trial + override.
type PurchasesModule = typeof import('react-native-purchases');
let Purchases: PurchasesModule['default'] | null = null;
let logLevelWarn: LOG_LEVEL | null = null;
function loadSDK(): boolean {
  if (Purchases) return true;
  // The native module ships only in builds compiled AFTER adding the dependency.
  // On an older dev build (e.g. JS reload over Wi-Fi) it's absent — and requiring
  // the JS wrapper would construct `new NativeEventEmitter(null)` and throw. The
  // library reads exactly this module, so its presence is the safe gate.
  if (NativeModules.RNPurchases == null) return false;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require('react-native-purchases') as PurchasesModule;
    Purchases = mod.default;
    logLevelWarn = mod.LOG_LEVEL.WARN;
    return !!Purchases;
  } catch {
    return false;
  }
}

let configured = false;

function isProEntitled(info: CustomerInfo): boolean {
  return info.entitlements.active[ENTITLEMENT] != null;
}

function updateFromCustomerInfo(info: CustomerInfo): void {
  subscription$.active.set(isProEntitled(info));
}

async function ensureConfigured(): Promise<boolean> {
  if (PREVIEW) return false;
  if (configured) return true;
  const key = process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY;
  if (!key) return false; // RevenueCat not set up yet — trial/admin still gate the app
  if (!loadSDK() || !Purchases) return false; // native module not in this build
  try {
    if (logLevelWarn != null) Purchases.setLogLevel(logLevelWarn);
    await Purchases.configure({ apiKey: key });
    Purchases.addCustomerInfoUpdateListener(updateFromCustomerInfo);
    configured = true;
    return true;
  } catch (e) {
    // eslint-disable-next-line no-console
    console.warn('[purchases] configure failed', e);
    return false;
  }
}

async function loadOfferings(): Promise<void> {
  if (!configured || !Purchases) return;
  try {
    const offerings = await Purchases.getOfferings();
    const current = offerings.current;
    subscription$.annual.set(current?.annual ?? null);
    subscription$.monthly.set(current?.monthly ?? null);
    subscription$.ready.set(true);
  } catch (e) {
    // eslint-disable-next-line no-console
    console.warn('[purchases] getOfferings failed', e);
  }
}

/** Tie RevenueCat to the signed-in user (or reset on sign-out) + load prices. */
export async function syncPurchasesUser(userId: string | null): Promise<void> {
  if (!(await ensureConfigured()) || !Purchases) return;
  try {
    if (userId) {
      const { customerInfo } = await Purchases.logIn(userId);
      updateFromCustomerInfo(customerInfo);
      await loadOfferings();
    } else {
      await Purchases.logOut();
      subscription$.active.set(false);
    }
  } catch (e) {
    // eslint-disable-next-line no-console
    console.warn('[purchases] sync user failed', e);
  }
}

/** Buy a package. Returns true if it left the user entitled. */
export async function purchasePackage(pkg: PurchasesPackage): Promise<boolean> {
  if (!(await ensureConfigured()) || !Purchases) return false;
  try {
    const { customerInfo } = await Purchases.purchasePackage(pkg);
    updateFromCustomerInfo(customerInfo);
    return isProEntitled(customerInfo);
  } catch (e) {
    const err = e as { userCancelled?: boolean };
    if (!err?.userCancelled) {
      // eslint-disable-next-line no-console
      console.warn('[purchases] purchase failed', e);
    }
    return false;
  }
}

/** Restore prior purchases. Returns true if it left the user entitled. */
export async function restorePurchases(): Promise<boolean> {
  if (!(await ensureConfigured()) || !Purchases) return false;
  try {
    const info = await Purchases.restorePurchases();
    updateFromCustomerInfo(info);
    return isProEntitled(info);
  } catch (e) {
    // eslint-disable-next-line no-console
    console.warn('[purchases] restore failed', e);
    return false;
  }
}
