// Web stub - Google Mobile Ads is native-only
import { useRef } from 'react';

export async function initializeAds(): Promise<void> {}

export async function requestConsent(): Promise<void> {}

const NOOP_AD = {
  show: () => {},
  load: () => {},
  isLoaded: false as const,
  isClosed: false as const,
};

export function useInterstitialAdUnit(): {
  show: () => void;
  load: () => void;
  isLoaded: boolean;
  isClosed: boolean;
} {
  // Return stable reference to avoid re-render loops from effect dependencies
  const ref = useRef(NOOP_AD);
  return ref.current;
}

export async function shouldShowAd(): Promise<boolean> {
  return false;
}

export async function recordAdImpression(): Promise<void> {}

export async function incrementGameCount(): Promise<void> {}
