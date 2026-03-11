import { Platform } from 'react-native';

// ─── Rewarded Ad (Opt-in Support) ─────────────────────────
// Uses Google AdMob with mediation for native platforms.
// Mediation networks (AppLovin, Unity, Meta, etc.) are configured
// in the AdMob dashboard - no code changes needed to add partners.
// On web, ads are not available.
//
// Test ad unit IDs (replace with real ones before production):
const REWARDED_AD_UNIT_ID = Platform.select({
  ios: 'ca-app-pub-3940256099942544/1712485313',
  android: 'ca-app-pub-3940256099942544/5224354917',
  default: '',
});

type AdStatus = 'idle' | 'loading' | 'loaded' | 'showing' | 'error';

let adStatus: AdStatus = 'idle';
let rewardedAd: ReturnType<typeof createRewardedAd> | null = null;
let createRewardedAd: ((adUnitId: string) => {
  load: () => void;
  show: () => Promise<void>;
  addAdEventListener: (event: string, callback: () => void) => () => void;
}) | null = null;
let RewardedAdEventType: Record<string, string> | null = null;
let AdEventType: Record<string, string> | null = null;

// Lazy-load the native module so it doesn't crash on web
async function loadAdModule(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  if (createRewardedAd) return true;

  try {
    const mod = await import('react-native-google-mobile-ads');
    createRewardedAd = (mod as { createRewardedAd: typeof createRewardedAd }).createRewardedAd;
    RewardedAdEventType = (mod as { RewardedAdEventType: Record<string, string> }).RewardedAdEventType;
    AdEventType = (mod as { AdEventType: Record<string, string> }).AdEventType;
    return true;
  } catch {
    return false;
  }
}

export async function preloadRewardedAd(): Promise<void> {
  const available = await loadAdModule();
  if (!available || !createRewardedAd || !REWARDED_AD_UNIT_ID) return;

  try {
    adStatus = 'loading';
    rewardedAd = createRewardedAd(REWARDED_AD_UNIT_ID);
    rewardedAd.load();
  } catch {
    adStatus = 'error';
  }
}

export async function showRewardedAd(): Promise<boolean> {
  if (Platform.OS === 'web') return false;

  const available = await loadAdModule();
  if (!available || !createRewardedAd || !REWARDED_AD_UNIT_ID) return false;

  return new Promise<boolean>((resolve) => {
    try {
      const ad = createRewardedAd!(REWARDED_AD_UNIT_ID);
      const unsubscribers: (() => void)[] = [];

      const cleanup = () => {
        unsubscribers.forEach((unsub) => unsub());
        adStatus = 'idle';
      };

      // Listen for reward earned
      if (RewardedAdEventType) {
        unsubscribers.push(
          ad.addAdEventListener(RewardedAdEventType.EARNED_REWARD, () => {
            cleanup();
            resolve(true);
          }),
        );
      }

      // Listen for ad closed without reward
      if (AdEventType) {
        unsubscribers.push(
          ad.addAdEventListener(AdEventType.CLOSED, () => {
            cleanup();
            resolve(false);
          }),
        );

        unsubscribers.push(
          ad.addAdEventListener(AdEventType.ERROR, () => {
            cleanup();
            resolve(false);
          }),
        );

        unsubscribers.push(
          ad.addAdEventListener(AdEventType.LOADED, () => {
            adStatus = 'showing';
            ad.show().catch(() => {
              cleanup();
              resolve(false);
            });
          }),
        );
      }

      adStatus = 'loading';
      ad.load();

      // Timeout after 15 seconds if ad never loads
      setTimeout(() => {
        if (adStatus === 'loading') {
          cleanup();
          resolve(false);
        }
      }, 15000);
    } catch {
      adStatus = 'idle';
      resolve(false);
    }
  });
}

export function isAdAvailable(): boolean {
  return Platform.OS !== 'web';
}
