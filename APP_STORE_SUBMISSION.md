# App Store Submission Checklist - Flag That

Audit date: 2026-08-06. This document tracks everything required to ship
Flag That to the Apple App Store and Google Play. Items are grouped by whether
they live in this repo (fixable in code) or in an external console/account.

## Status summary

The app itself is in good shape:

- TypeScript compiles clean (`tsc --noEmit`), 208 unit tests pass.
- No `console.log`/`console.warn` noise, no `any`, no leftover TODOs.
- All 6 locales (en, fr, es, de, pt-BR, zh) present.
- Privacy policy (`/privacy`) and terms (`/terms`) exist and are wired into
  `vercel.json` rewrites.
- iOS privacy manifest declares no collected data, `ITSAppUsesNonExemptEncryption: false`.
- Analytics (`@vercel/analytics`) is web-only (`Platform.OS === 'web'`), so the
  native builds collect nothing - the empty `NSPrivacyCollectedDataTypes` is accurate.
- App icon is 1024x1024. Adaptive icon foreground/background/monochrome present.

What blocks submission is almost entirely account/credential setup, not code.

## Blockers - must be done before you can build or submit

### 1. EAS project not initialized (blocks all cloud builds)

`app.json` -> `extra.eas.projectId` is empty. Run `eas init` (or
`eas build:configure`) while logged in; it writes the real project ID and owner.
Without it `eas build` cannot run.

### 2. iOS submit credentials missing (`eas.json`)

Account decision (2026-10-19): enrolled as an **Individual** developer account
under Apple ID `beynon.julie@gmail.com`. The App Store seller will show the
enrollee's personal legal name, not a company. The app can be moved to an
Organization account later via App Store Connect's App Transfer once the
company (Ontario corp, D-U-N-S pending) is enrolled.

- `appleId` - set to `beynon.julie@gmail.com`. Done.
- `appleTeamId` - still empty. Your Apple Developer Team ID (10-char code on the
  Membership details page at developer.apple.com/account).
- `ascAppId` - still empty. The numeric App Store Connect app ID, created when
  you register the app (App Store Connect -> Apps -> New App, bundle ID
  `com.flagsareus.app`); it shows under App Information after creation.

### 3. Android submit credentials missing (`eas.json`)

`submit.production.android.serviceAccountKeyPath` is empty. Create a Google
Play service account JSON key and point this at it (keep the file out of git -
it is already covered by `.gitignore` patterns, but store it outside the repo).

### 4. Deep-link verification files (Universal Links / App Links)

- `public/.well-known/apple-app-site-association` contains a literal
  `TEAMID` placeholder in `"TEAMID.com.flagsareus.app"`. Replace with your real
  Apple Team ID or Universal Links (the `applinks:flagthat.app` associated
  domain) will not verify. This file must be served at
  `https://flagthat.app/.well-known/apple-app-site-association` with
  `Content-Type: application/json` and no redirect.
- `public/.well-known/assetlinks.json` does **not exist**. Android App Links
  (`autoVerify: true` intent filters in `app.json`) will fail verification
  without it. Generate it after the first build with the app-signing cert
  SHA-256 fingerprint (from Play Console -> App integrity, or
  `eas credentials`). Format:

  ```json
  [{
    "relation": ["delegate_permission/common.handle_all_urls"],
    "target": {
      "namespace": "android_app",
      "package_name": "com.flagsareus.app",
      "sha256_cert_fingerprints": ["<SHA256_FROM_PLAY_APP_SIGNING>"]
    }
  }]
  ```

  Note: deep links still work via the custom `flagthat://` scheme even if
  verification is pending, so this is not a hard gate on approval - but the
  https:// links will open a browser instead of the app until it is fixed.

### 5. Apple Developer + Google Play accounts

- Apple Developer Program membership ($99/yr) active.
- Bundle ID `com.flagsareus.app` registered (EAS can create it).
- Google Play Developer account ($25 one-time), app created with package
  `com.flagsareus.app`.

## Store listing content (App Store Connect / Play Console)

None of this lives in the repo; prepare it before submission:

- App name, subtitle, promotional text, full description, keywords.
- Category (Games -> Trivia/Education) and age rating questionnaire answers.
- Screenshots: iPhone 6.9" and 6.5" (required), iPad 13" (since
  `supportsTablet: true`), plus Android phone/tablet screenshots.
- Support URL and marketing URL (e.g. `https://flagthat.app`). Apple requires a
  reachable support URL.
- **Privacy nutrition label (Apple) / Data safety form (Google).** The native
  apps collect no data and store everything locally via AsyncStorage - answer
  accordingly. Note the app requests notification permission only when the user
  enables the daily reminder.
- Confirm `flagthat.app` actually resolves and serves `/privacy` and `/terms`
  in production (Vercel) - Apple and Google both fetch the privacy URL.

## Pre-flight technical checks

- [x] `expo-constants` pin corrected from stale `~17.0.8` to `~55.0.7`
      (was resolving to a duplicate native module vs. the SDK 55 copy).
- [ ] `expo-av` (used in `src/utils/feedback.ts`) is **deprecated**. It still
      installs on SDK 55, but Expo recommends migrating to `expo-audio`. Not a
      submission blocker today; plan the migration before it is removed in a
      future SDK.
- [ ] Run `eas build -p ios --profile production` and
      `eas build -p android --profile production` and smoke-test the release
      binaries on a real device (deep links, notifications, sound/haptics,
      onboarding, each game mode).
- [ ] Verify version/build numbers. `app.json` has `version: 1.0.0`,
      iOS `buildNumber: 1`, Android `versionCode: 1`. Because `eas.json` uses
      `appVersionSource: remote` with iOS `autoIncrement: true`, EAS manages
      build numbers server-side - just confirm the remote version on first build.
- [ ] TestFlight (iOS) / internal testing track (Android) pass before promoting
      to production review.

## Notes

- `minimumOSVersion: 16.0` (iOS) and `minSdkVersion: 24` / `targetSdkVersion: 35`
  (Android) meet current store requirements.
- No custom native modules beyond Expo config plugins
  (`expo-screen-orientation`, `expo-notifications`), so the managed EAS build
  flow is sufficient - no bare workflow needed.
