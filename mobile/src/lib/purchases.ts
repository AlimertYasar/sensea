// In-app subscriptions via RevenueCat (wraps Apple App Store + Google Play billing).
// Digital subscriptions MUST go through the stores' billing on both platforms.
//
// Setup (see YAYIN_REHBERI.md): create products in App Store Connect / Play Console,
// add them to RevenueCat with entitlements "premium" and "plus", then set
// EXPO_PUBLIC_RC_IOS_KEY / EXPO_PUBLIC_RC_ANDROID_KEY.
// Purchases don't work in Expo Go or on web; use a development build.

import Constants, { ExecutionEnvironment } from 'expo-constants';
import { Platform } from 'react-native';

import { DEV_TIER } from './api';
import { useStore } from './store';
import type { Tier } from './types';

const KEY = Platform.select({
  ios: process.env.EXPO_PUBLIC_RC_IOS_KEY,
  android: process.env.EXPO_PUBLIC_RC_ANDROID_KEY,
  default: undefined,
});

export const purchasesAvailable =
  Platform.OS !== 'web' && !!KEY && Constants.executionEnvironment !== ExecutionEnvironment.StoreClient;

type RC = typeof import('react-native-purchases').default;
let rc: RC | null = null;

function tierFrom(info: { entitlements: { active: Record<string, unknown> } }): Tier {
  if (info.entitlements.active.plus) return 'plus';
  if (info.entitlements.active.premium) return 'premium';
  return 'free';
}

export async function initPurchases(installId: string) {
  if (DEV_TIER) {
    useStore.getState().setTier(DEV_TIER);
    return;
  }
  if (!purchasesAvailable) return;
  try {
    rc = require('react-native-purchases').default as RC;
    rc.configure({ apiKey: KEY!, appUserID: installId });
    rc.addCustomerInfoUpdateListener((info) => useStore.getState().setTier(tierFrom(info)));
    useStore.getState().setTier(tierFrom(await rc.getCustomerInfo()));
  } catch (e) {
    console.warn('RevenueCat init failed', e);
  }
}

export interface Plan {
  id: string;
  tier: Exclude<Tier, 'free'>;
  price: string;
  period: 'month' | 'year';
  pkg: unknown;
}

export async function getPlans(): Promise<Plan[]> {
  if (!rc) return [];
  const offerings = await rc.getOfferings();
  const pkgs = offerings.current?.availablePackages ?? [];
  return pkgs.map((p) => ({
    id: p.identifier,
    tier: p.product.identifier.includes('plus') ? 'plus' : 'premium',
    price: p.product.priceString,
    period: p.packageType === 'ANNUAL' ? 'year' : 'month',
    pkg: p,
  }));
}

/** Returns true when the purchase went through. */
export async function buy(plan: Plan): Promise<boolean> {
  if (!rc) return false;
  try {
    const { customerInfo } = await rc.purchasePackage(plan.pkg as any);
    useStore.getState().setTier(tierFrom(customerInfo));
    return true;
  } catch (e: any) {
    if (e?.userCancelled) return false;
    throw e;
  }
}

export async function restore(): Promise<Tier> {
  if (!rc) return useStore.getState().tier;
  const info = await rc.restorePurchases();
  const tier = tierFrom(info);
  useStore.getState().setTier(tier);
  return tier;
}

export const manageUrl = Platform.select({
  ios: 'https://apps.apple.com/account/subscriptions',
  default: 'https://play.google.com/store/account/subscriptions',
});
