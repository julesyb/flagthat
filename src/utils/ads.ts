import {
  MobileAds,
  TestIds,
  AdsConsent,
  AdsConsentStatus,
  useInterstitialAd as useInterstitialAdNative,
} from 'react-native-google-mobile-ads';
import {
  requestTrackingPermissionsAsync,
  getTrackingPermissionsAsync,
} from 'expo-tracking-transparency';
import AsyncStorage from '@react-native-async-storage/async-storage';

const INTERSTITIAL_ID = TestIds.INTERSTITIAL;

const AD_GAME_COUNT_KEY = '@flagthat_ad_game_count';
const GAMES_BETWEEN_ADS = 3;

let initialized = false;
let consentGiven = false;

export async function requestConsent(): Promise<void> {
  try {
    // iOS ATT prompt must come before UMP consent
    const { granted } = await requestTrackingPermissionsAsync();

    const consentInfo = await AdsConsent.requestInfoUpdate();
    if (
      consentInfo.isConsentFormAvailable &&
      consentInfo.status === AdsConsentStatus.REQUIRED
    ) {
      const result = await AdsConsent.showForm();
      consentGiven = granted && result.status === AdsConsentStatus.OBTAINED;
    } else {
      consentGiven = granted && consentInfo.status === AdsConsentStatus.OBTAINED;
    }
  } catch {
    // Consent unavailable or dismissed - default to non-personalized
    consentGiven = false;
  }
}

export async function initializeAds(): Promise<void> {
  if (initialized) return;
  try {
    await MobileAds().initialize();
    initialized = true;
  } catch {
    // Ads init failed - app continues without ads
  }
}

export function useInterstitialAdUnit() {
  return useInterstitialAdNative(INTERSTITIAL_ID, {
    requestNonPersonalizedAdsOnly: !consentGiven,
  });
}

export async function shouldShowAd(): Promise<boolean> {
  try {
    const raw = await AsyncStorage.getItem(AD_GAME_COUNT_KEY);
    const count = raw ? parseInt(raw, 10) : 0;
    return count >= GAMES_BETWEEN_ADS;
  } catch {
    return false;
  }
}

export async function recordAdImpression(): Promise<void> {
  try {
    await AsyncStorage.setItem(AD_GAME_COUNT_KEY, '0');
  } catch {
    // Non-critical
  }
}

export async function incrementGameCount(): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem(AD_GAME_COUNT_KEY);
    const count = raw ? parseInt(raw, 10) : 0;
    await AsyncStorage.setItem(AD_GAME_COUNT_KEY, String(count + 1));
  } catch {
    // Non-critical
  }
}
