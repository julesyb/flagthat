# Opt-in Ads - Go Live Checklist

Steps required before shipping the opt-in rewarded ads feature to production.
Uses **Google AdMob** with **mediation** to maximize fill rate and revenue.

---

## 1. Create an AdMob Account

- Sign up at https://admob.google.com
- Register your app for both iOS and Android
- AdMob will assign you an **App ID** for each platform (format: `ca-app-pub-XXXXXXXXXXXXXXXX~YYYYYYYYYY`)

## 2. Create a Rewarded Ad Unit

- In the AdMob dashboard, go to **Apps > Ad units > Add ad unit**
- Select **Rewarded** as the ad format
- Create one ad unit for iOS and one for Android
- Each will give you an **Ad Unit ID** (format: `ca-app-pub-XXXXXXXXXXXXXXXX/YYYYYYYYYY`)

## 3. Enable Mediation Networks

In the AdMob dashboard, go to **Mediation > Create mediation group**:

- Ad format: **Rewarded**
- Platforms: iOS and Android (create one group per platform)

Add mediation sources (each requires its own account and credentials):

| Network | Notes |
|---------|-------|
| **AppLovin** | Strong eCPM, popular for games |
| **Unity Ads** | Good for gaming audiences |
| **Meta Audience Network** | High fill rate |
| **ironSource** | Good for rewarded ads specifically |
| **Mintegral** | Strong in APAC markets |

You can also enable **bidding** for supported networks (AppLovin, Meta, Unity) - this lets networks compete in real-time auction instead of using a fixed waterfall.

AdMob handles all mediation routing automatically. No code changes are needed to add or remove networks.

## 4. Replace Placeholder IDs

### app.json

Replace the placeholder App IDs in the `react-native-google-mobile-ads` plugin config:

```json
[
  "react-native-google-mobile-ads",
  {
    "androidAppId": "ca-app-pub-YOUR_REAL_ANDROID_APP_ID",
    "iosAppId": "ca-app-pub-YOUR_REAL_IOS_APP_ID"
  }
]
```

### src/utils/ads.ts

Replace the test Ad Unit IDs on lines 11-12 with your production ones:

```ts
const REWARDED_AD_UNIT_ID = Platform.select({
  ios: 'ca-app-pub-YOUR_REAL_IOS_AD_UNIT_ID',
  android: 'ca-app-pub-YOUR_REAL_ANDROID_AD_UNIT_ID',
  default: '',
});
```

The current values (`ca-app-pub-3940256099942544/...`) are Google's official test IDs. They work but only show test ads and generate no revenue.

## 5. Install Dependencies

```bash
npm install
```

This pulls in `react-native-google-mobile-ads` which was added to `package.json`.

## 6. Use EAS Development Build (Not Expo Go)

The Google Mobile Ads SDK requires native code, so it cannot run in Expo Go. You must use a custom development build:

```bash
# Install EAS CLI if you haven't
npm install -g eas-cli

# Build a development client
eas build --profile development --platform ios
eas build --profile development --platform android
```

For local development, you can also use:

```bash
npx expo run:ios
npx expo run:android
```

## 7. Update Privacy Policy

Your privacy policy at https://flagthat.app/privacy should disclose:

- The app uses Google AdMob with mediation for optional rewarded video ads
- Ads are only shown when the user explicitly chooses to watch one
- Google and mediation partners may collect device identifiers and usage data during ad playback
- Link to Google's privacy policy: https://policies.google.com/privacy
- Link to each enabled mediation partner's privacy policy

## 8. App Store Compliance

### Apple App Store (iOS)

- The `NSUserTrackingUsageDescription` is already set in `app.json` for the App Tracking Transparency (ATT) prompt on iOS 14.5+
- In App Store Connect, update your app's privacy nutrition labels to declare **Advertising Data** collection (collected only when user opts in)
- If you want to skip the ATT prompt entirely (no personalized ads), add this to your app startup:

```ts
import mobileAds from 'react-native-google-mobile-ads';

mobileAds().setRequestConfiguration({
  tagForChildDirectedTreatment: false,
  maxAdContentRating: 'G',
});
```

### Google Play Store (Android)

- Update your Data Safety section to declare ad-related data collection
- Mark it as **optional** since ads are opt-in only
- If targeting children or families, ensure ad content rating is set appropriately

## 9. Test on Real Devices

Before submitting to app stores:

- [ ] Verify the SupportCard appears on the Home screen after playing at least one game
- [ ] Verify the Support section appears in Settings on iOS and Android
- [ ] Verify neither appears on web (ads are web-disabled)
- [ ] Tap "Watch a Short Video" and confirm a test ad plays
- [ ] Confirm the "Thank you" message appears after watching
- [ ] Confirm the watch count increments and persists across app restarts
- [ ] Confirm the ad fails gracefully when offline (shows "No video available" message)
- [ ] Verify the ad does not auto-play or appear without user action
- [ ] Enable test device in AdMob dashboard during development

## 10. Monitor Post-Launch

After shipping:

- Check AdMob dashboard for fill rate (aim for 80%+ for rewarded ads)
- Monitor eCPM per network in the mediation report
- Rewarded ads typically earn $10-30 eCPM depending on region
- Track user engagement via the `totalAdsWatched` counter in AsyncStorage
- If fill rate is low, enable additional mediation networks (step 3)
- Use AdMob's **A/B testing** to optimize waterfall ordering
- Review the **Ad source report** to see which networks are winning the most impressions

---

## File Reference

| File | What to change |
|------|---------------|
| `app.json` | Replace placeholder App IDs (lines 61-62) |
| `src/utils/ads.ts` | Replace test Ad Unit IDs (lines 11-12) |
| Privacy policy | Add AdMob and mediation partner disclosures |
| App Store / Play Store | Update privacy declarations |
| AdMob dashboard | Configure mediation networks |
