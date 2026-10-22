# App Store Connect - Field Sheet

Everything to paste into https://appstoreconnect.apple.com/apps for Flag That 1.0.
Fields are in the order App Store Connect shows them. Character counts are
checked against Apple's limits.

Anything marked **YOU** needs your own info.

---

## 1. Create the app (Apps -> "+" -> New App)

| Field | Value |
| --- | --- |
| Platforms | iOS |
| Name | `Flag That: Flag Quiz` (20/30) |
| Primary language | English (U.S.) |
| Bundle ID | `com.flagsareus.app` |
| SKU | `flagthat-ios-001` (any unique string, never shown to users) |
| User access | Full Access |

If the bundle ID is not in the dropdown, register it first at
developer.apple.com -> Certificates, IDs & Profiles -> Identifiers -> "+" ->
App IDs -> App. Turn on **Associated Domains** (needed for the `flagthat.app`
links) and **Push Notifications** (daily reminder). Or run
`eas build -p ios` once and let EAS create it.

After creating the app, copy the numeric **Apple ID** from
App Information. That goes in `eas.json` as `ascAppId`.

---

## 2. App Information

| Field | Value |
| --- | --- |
| Subtitle | `Learn every flag in the world` (29/30) |
| Category | Games |
| Subcategories | Trivia, Educational |
| Secondary category | Education |
| Content rights | "No, it does not contain, show, or access third-party content" |
| Age rating | See section 5 |

---

## 3. Pricing and Availability

| Field | Value |
| --- | --- |
| Price | Free (USD 0) |
| Availability | All countries or regions |
| Tax category | App Store software (default) |

---

## 4. App Privacy

**Privacy Policy URL:** `https://flagthat.app/privacy`

**Data collection:** choose **"No, we do not collect data from this app."**

Why this is correct for the iOS build:
- No accounts, no backend. Progress lives in AsyncStorage on the device.
- Vercel Analytics only runs on the web build (`Platform.OS === 'web'`).
- No ads or ad SDKs. (The "Watch a video" strings in the locale files are not
  wired to anything.)
- Flag images load from the bundle; flagcdn.com is only a fallback, and Apple
  does not count a plain image request as data collection.

The privacy label will read **"Data Not Collected."**

---

## 5. Age Rating

Answer **None** / **No** to every question:

| Question | Answer |
| --- | --- |
| Violence (cartoon, realistic, prolonged) | None |
| Sexual content or nudity | None |
| Profanity or crude humor | None |
| Alcohol, tobacco, drugs | None |
| Mature or suggestive themes | None |
| Horror or fear themes | None |
| Medical or treatment info | None |
| Simulated gambling | None |
| Contests | None |
| Unrestricted web access | No |
| User-generated content | No |
| Messaging or chat | No |
| Loot boxes / in-app purchases | No |
| Parental controls / age assurance | No |
| Made for Kids | No (opting in adds strict ad and link rules for little benefit) |

Result: **4+**

---

## 6. Version 1.0 - Prepare for Submission

### Promotional Text (140/170)

```
A new Daily Challenge every day. Same 10 flags for everyone, one shot. Keep your streak alive and see how you stack up against your friends.
```

### Description

```
How many flags do you really know?

Flag That is a quick, good-looking flag quiz covering all 195+ countries. Play for two minutes or two hours, and watch your map knowledge grow.

GAME MODES
- Classic: Easy, Medium or Hard. Pick from two flags, four flags, or type the answer.
- Timed: 60 seconds. Answer as many as you can.
- Flag Puzzle: The flag reveals tile by tile. Guess before it is done.
- Neighbors: Name every country that borders the one shown.
- Flag Impostor: One flag is fake. Spot it.
- Capital Connection: Match flags to their capital cities.
- GeoFacts: Browse facts about each country, then test yourself.
- Daily Challenge: The same 10 flags for everyone, once a day.
- Practice: Drill the flags you keep missing.

MAKE IT YOURS
- Filter by region: Africa, Asia, Europe, Americas, Oceania.
- Or by theme: Famous Flags, Tricky Twins, Island Nations, Top Destinations.
- Choose flags or maps, question count and lives.

LEARN AS YOU GO
Get one wrong and Flag That shows your pick next to the right answer, so the difference sticks.

TRACK YOUR PROGRESS
- Day streaks, accuracy and mastered flags.
- 10 levels and a set of badges to earn.
- Challenge a friend with a code and play the exact same flags.

BUILT TO RESPECT YOU
- No account needed.
- No data collected. Everything stays on your device.
- Flag modes work offline.
- Light and dark mode.
- English, French, Spanish, German, Portuguese and Chinese.

Great for travelers, geography fans, students and anyone who has ever mixed up Chad and Romania.
```

### Keywords (95/100)

```
geography,country,countries,trivia,world,capitals,map,learn,game,daily,puzzle,neighbors,borders
```

"flag" and "quiz" are left out on purpose: they are already in the app name,
and Apple indexes the name, so repeating them wastes space.

### URLs

| Field | Value |
| --- | --- |
| Support URL | `https://flagthat.app/support` |
| Marketing URL | `https://flagthat.app` |

### Version

| Field | Value |
| --- | --- |
| Version | `1.0.0` (matches `app.json`) |
| Copyright | `2026 JBI` |

### Screenshots

Required sizes (portrait):

| Display | Pixels | Required |
| --- | --- | --- |
| iPhone 6.9" | 1320 x 2868 | Yes |
| iPhone 6.5" | 1284 x 2778 | Yes, unless 6.9" is supplied (then optional) |
| iPad 13" | 2064 x 2752 | Yes, because `supportsTablet: true` |

Up to 10 each. Suggested order: Home, a Classic question, the Learn card after
a miss, Flag Puzzle, Daily Challenge, Stats.

### App Review Information

| Field | Value |
| --- | --- |
| Sign-in required | No (uncheck) |
| Contact first/last name | **YOU** |
| Phone | **YOU** |
| Email | `beynon.julie@gmail.com` |

**Notes for the reviewer:**

```
Flag That is a flag quiz game. No account or sign-in is needed, and all progress is saved on the device.

Notifications are optional. The app only asks for permission if the player turns on the daily reminder in Settings, or accepts the one-time reminder offer after a good round.

Links like https://flagthat.app/c/... open a friend challenge inside the app. To test: finish any round, tap Challenge a Friend on the results screen to get a code, then go to Home > Challenge and paste it.

The app has no in-app purchases and no ads.
```

### Build

Pick the build uploaded by `eas submit` (see section 7). It shows up a few
minutes after upload, once processing finishes.

### Release

Choose **Manually release this version** for the first launch, so you control
the day it goes live.

---

## 7. Build and upload

One-time setup in the repo, once you have the two IDs:

1. `npx eas-cli login`
2. `npx eas-cli init` (fills `extra.eas.projectId` in `app.json`)
3. In `eas.json` -> `submit.production.ios` set:
   - `appleTeamId`: `3F3D6DY5HC` (done)
   - `ascAppId`: the numeric Apple ID from step 1 **YOU**
4. `public/.well-known/apple-app-site-association` already uses Team ID
   `3F3D6DY5HC` (done). It goes live when this is merged and the site redeploys.

Then:

```
npx eas-cli build -p ios --profile production
npx eas-cli submit -p ios --profile production --latest
```

Install from TestFlight and run through every mode on a real phone before
pressing **Add for Review**.

---

## 8. Before you press Submit

- [ ] https://flagthat.app/privacy loads
- [ ] https://flagthat.app/support loads, and `support@flagthat.app` actually receives mail **YOU**
- [ ] https://flagthat.app/.well-known/apple-app-site-association returns JSON with your real Team ID
- [ ] Screenshots uploaded for iPhone and iPad
- [ ] Age rating done, privacy label published
- [ ] Build selected, export compliance answered (already set to "no non-exempt encryption" in `app.json`, so no question should appear)
