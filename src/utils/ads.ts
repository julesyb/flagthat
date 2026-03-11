import { Platform } from 'react-native';
import {
  MobileAds,
  TestIds,
  AdsConsent,
  AdsConsentStatus,
  useInterstitialAd as useInterstitialAdNative,
} from 'react-native-google-mobile-ads';
import { requestTrackingPermissionsAsync } from 'expo-tracking-transparency';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ─── Interstitial Ads (frequency-capped between games) ───
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

// ─── Rewarded Ad (Opt-in Support) ────────────────────────
// Uses Google AdMob with mediation for native platforms.
// Mediation networks (AppLovin, Unity, Meta, etc.) are configured
// in the AdMob dashboard - no code changes needed to add partners.
//
// Test ad unit IDs (replace with real ones before production):
const REWARDED_AD_UNIT_ID = Platform.select({
  ios: 'ca-app-pub-3940256099942544/1712485313',
  android: 'ca-app-pub-3940256099942544/5224354917',
  default: '',
});

type AdStatus = 'idle' | 'loading' | 'loaded' | 'showing' | 'error';

let adStatus: AdStatus = 'idle';

export async function preloadRewardedAd(): Promise<void> {
  if (Platform.OS === 'web' || !REWARDED_AD_UNIT_ID) return;

  try {
    const { RewardedAd } = await import('react-native-google-mobile-ads');
    const ad = RewardedAd.createForAdRequest(REWARDED_AD_UNIT_ID, {
      requestNonPersonalizedAdsOnly: !consentGiven,
    });
    adStatus = 'loading';
    ad.load();
  } catch {
    adStatus = 'error';
  }
}

export async function showRewardedAd(): Promise<boolean> {
  if (Platform.OS === 'web' || !REWARDED_AD_UNIT_ID) return false;

  try {
    const {
      RewardedAd,
      RewardedAdEventType: RewEventType,
      AdEventType: EvtType,
    } = await import('react-native-google-mobile-ads');

    return new Promise<boolean>((resolve) => {
      const ad = RewardedAd.createForAdRequest(REWARDED_AD_UNIT_ID, {
        requestNonPersonalizedAdsOnly: !consentGiven,
      });
      const unsubscribers: (() => void)[] = [];

      const cleanup = () => {
        unsubscribers.forEach((unsub) => unsub());
        adStatus = 'idle';
      };

      unsubscribers.push(
        ad.addAdEventListener(RewEventType.EARNED_REWARD, () => {
          cleanup();
          resolve(true);
        }),
      );

      unsubscribers.push(
        ad.addAdEventListener(EvtType.CLOSED, () => {
          cleanup();
          resolve(false);
        }),
      );

      unsubscribers.push(
        ad.addAdEventListener(EvtType.ERROR, () => {
          cleanup();
          resolve(false);
        }),
      );

      unsubscribers.push(
        ad.addAdEventListener(EvtType.LOADED, () => {
          adStatus = 'showing';
          ad.show().catch(() => {
            cleanup();
            resolve(false);
          });
        }),
      );

      adStatus = 'loading';
      ad.load();

      // Timeout after 15 seconds if ad never loads
      setTimeout(() => {
        if (adStatus === 'loading') {
          cleanup();
          resolve(false);
        }
      }, 15000);
    });
  } catch {
    adStatus = 'idle';
    return false;
  }
}

export function isAdAvailable(): boolean {
  return Platform.OS !== 'web';
}
