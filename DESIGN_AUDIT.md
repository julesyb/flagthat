# Flag That - Design Audit and Improvement Plan

October 2026. Scope: everything (brand, game feel, progression, navigation, copy).

## How this audit was done

- Read every screen, the game engine, storage, levels, badges and the locale files.
- Built the web version and walked a fresh install end to end at phone size: onboarding, a 10-flag game, results, Home, Stats, Modes.
- Judged it the way a new player would on day 1, day 3 and day 14.

## What is already good

Worth saying first, because none of this should be lost:

- The visual language is distinctive. Libre Baskerville plus Barlow, parchment and ink, the gold CTA with a hard shadow. It looks like an atlas, not another neon trivia app.
- The engine is smarter than the UI shows. The two-lane flag selection (hard cycle plus an urgent lane for misses) is real spaced repetition.
- Content depth is strong: 197 flags, maps, capitals, neighbors, 2,400 lines of facts, 6 languages, a daily, link-based challenges.

The problems are not about missing features. The app has too many features competing for attention, and the systems that should make people come back are either broken or invisible.

## The top three

| # | Area | Why it matters most |
|---|------|---------------------|
| 1 | Progression is broken and fragmented | It is the reason to come back tomorrow. Today a new player sits at "Level 0" for weeks. |
| 2 | The core round does not teach or thrill | It is 90% of time spent in the app. Wrong answers flash by, scores are flat, distractors are random. |
| 3 | First run and Home are overloaded | It decides whether anyone gets to areas 1 and 2. A new player faces 5 choices, then a Home with two mini-quizzes, two settings rows and up to 7 mode rows. |

---

## 1. Progression: replace five half-systems with one Passport

### What is wrong

**Level 1 is effectively unreachable for most players.**
`src/utils/levels.ts` sets Level 1 to "Get 197 correct in Easy". The app defaults new players to Medium (Home teaser, onboarding "Give it a try"), and Medium answers count toward `modeStats.medium`, not `easy`. So a player who plays Medium, Daily, or Timed every day stays at Level 0 forever. Stats literally shows "Level 0 / Starter / 0 / 197" after the first game. Home shows a gold "LEVEL 0" pill in the header, which reads as a judgement, not an invitation.

Levels 4 to 8 then require 100 correct in one specific mode each, so the order you are allowed to enjoy the game is dictated to you. Level 10 is "every flag right 10 times" (about 2,000 correct answers).

**There are five overlapping progress systems, and none of them is the hero.**

1. Levels 1-10 (`levels.ts`)
2. Skill level beginner/intermediate/advanced/expert (`storage.ts`), which only promotes after 10 consecutive perfect games, so it almost never moves
3. 25 badges (`badges.ts`)
4. "Mastered" flags (3 right in a row)
5. Baseline region tests (5 regions, first/best/recent)

Plus the day streak, which is the single strongest retention mechanic in this genre, and it is not on Home at all. It only appears as a small pill on the Stats screen. (CLAUDE.md even specifies a streak badge on Home; it was lost in the Home redesigns.)

**The Daily is not a reliable habit anchor.** `DAILY_VARIANTS` rotates across 12 formats, including "hard + map" (type a country name from its outline). One day it is a 2-choice easy quiz, the next it is near impossible. A habit needs a predictable shape. The first Daily share also asks for a name before the share sheet opens (later shares reuse it).

**Reminders are off unless you find them.** `dailyReminderEnabled` defaults to false and the only way to turn it on is a toggle in Settings. The app never asks. For a daily-habit app this is a large, cheap miss.

**Answers in the Home teaser and Fact of the Day do not count toward anything.**

### The fix: "Your Passport"

One metaphor that turns all of the above into a single, visible collection. Flags are about countries; the natural thing to collect is countries.

**Core loop**

- Every country starts as an empty page in your Passport.
- Get a flag right once: the page gets an outline stamp ("Seen").
- Get it right 3 times in a row (the existing `MASTERED_STREAK`): full ink stamp ("Collected").
- Miss a collected flag later: the stamp fades to "Needs review" and the existing urgent lane brings it back. Nothing is ever taken away, it just asks for a revisit.
- Headline number everywhere: **"84 / 197 collected"**. This replaces "Level 0".

Every mode feeds the same Passport. Timed, Puzzle, Capitals, Neighbors, Daily, even the Home teaser. Play whatever you like and you still progress.

**Ranks replace Levels** (derived from the collection count, fast early curve):

| Rank | Collected | Typical time to reach |
|------|-----------|-----------------------|
| Tourist | 0 | first launch |
| Backpacker | 10 | first session |
| Traveler | 30 | day 2-3 |
| Explorer | 60 | week 1 |
| Navigator | 100 | week 2-3 |
| Diplomat | 150 | month 1-2 |
| Cartographer | 197 | the goal |
| Ambassador | 197 at "fast" (avg under 3s) | prestige |

First rank-up happens in the first session. That is the point.

**Region pages** replace the baseline test UI. Each region in the Passport shows its stamps and a ring (e.g. "Europe 31/45"). Completing a region gives a full-page stamp moment. This absorbs the region badges and the baseline region cards.

**Streak on Home, with a daily goal.**

- Home header: streak pill (number, "day streak", 7 pip dots), as the design system already specifies.
- Daily goal: "Collect or review 10 flags today". Ring fills during any mode. Completing the goal is what extends the streak, not just opening the app.
- One streak freeze earned per 7-day streak (stored locally, max 2). Missed day consumes it. This is the single biggest retention lever in Duolingo-style loops and costs almost nothing to build.

**Daily becomes predictable.** Same shape every day: 10 flags, 4 choices, everyone gets the same set (keep `generateDailyQuestions`). Difficulty climbs across the week (Mon easy flags, Sun tricky twins) instead of random formats. Keep the variety by making Sunday a "special" format (puzzle or capitals). Share without a name prompt: name is optional and asked once, later, from the leaderboard card.

**Badges stay, but demoted** to a "Stamps of honor" section at the back of the Passport. Delete the separate skill level system and auto-adjust difficulty in-round instead (see area 2).

### Implementation plan

1. **New module `src/utils/passport.ts`** (pure functions, unit tested):
   - `getCountryState(flagStats, id): 'empty' | 'seen' | 'collected' | 'review'`
   - `getPassportSummary(flagStats): { collected, seen, review, byRegion }`
   - `RANKS` as data `{ id, minCollected, requiresFast? }` and `getRank(summary, stats)`
   - `FlagStats` today only stores `right`, `wrong` and `rightStreak`, so it cannot tell "collected, then missed" apart from "never collected". Add one field, `collectedAt?: number`, set the first time `rightStreak` reaches `MASTERED_STREAK` and never cleared. Then `review` = `collectedAt` set and `rightStreak === 0`.
   - One-time backfill for existing players: set `collectedAt` where `rightStreak >= 3`. Flags with `right >= 3` but a broken streak are ambiguous; treat them as `seen` (slightly conservative, never wrong in the player's favour).
2. **Daily goal + freeze in `storage.ts`**: `DailyGoal { date, target, progress }`, `StreakFreeze { count }`. Hook goal progress into `updateFlagResults` so every mode counts. Record Home teaser answers through the same path.
3. **`src/components/StreakPill.tsx`** and **`src/components/PassportRing.tsx`** (shared, used on Home, Results, Stats).
4. **Rename Stats tab to Passport** (`StatsScreen.tsx`): header = rank + "84 / 197 collected", grid of region pages, tap a region for a stamp grid of flags (reuse `FlagImage` small). Keep accuracy and history below the fold.
5. **Results**: replace the level line with "+3 collected, 1 needs review" and animate the new stamps landing. Rank-up uses the existing `LevelUpModal`, renamed.
6. **Remove**: `levels.ts` requirement engine, skill level storage and `onboarding.skill*` strings (already mostly orphaned), `persistLevel`. Ranks are derived from the collection, so old levels need no carry-over; the only migration is the `collectedAt` backfill in step 1.
7. **Daily**: replace `DAILY_VARIANTS` random rotation with a weekday schedule table in `gameEngine.ts`. Make the name modal in `ResultsScreen.doDailyShare` optional.
8. **i18n**: rank names, Passport strings, goal strings in all 6 locales.

**Success metrics** (see "Measuring any of this" below): day-1 and day-7 return rate, % of players who see a rank-up in session 1 (target over 80%), median sessions per week.

---

## 2. The core round: make every answer teach and every streak feel good

### What is wrong

**Wrong answers do not teach.** In `GameScreen.tsx` a miss shows red/green for 1.2s and then auto-advances. You barely have time to read the correct name, let alone learn why your guess was wrong. The app knows which flags you confuse (it records your wrong answer) Since #142 the Results screen does show your pick and the right flag side by side, but only after the round, in a long list, when the moment has passed. Nothing happens at the moment of the mistake.

**Distractors are mostly random.** `generateOptions` prefers look-alike twins, but only 81 flags have a twin entry. The other 116 get random countries from whatever pool you are playing. Region filters narrow that pool, but the default Home "Play Now" uses all 197, so in the common case options come from anywhere. In testing: "Benin / Mozambique / Solomon Islands / Saint Lucia". You can often eliminate by vague region or color without knowing the flag, and you never practise the distinctions that actually matter.

**Scoring is flat.** Every round ends as "30%, 3/10 correct". There is a streak counter in the top bar but no points, no combo, no speed reward, no personal best per mode (except Timed). The Results hero is a big percentage, which is great when you get 100% and deflating at 30%.

**Difficulty is a manual setting.** The player has to choose Easy/Medium/Hard on Home before playing, and the automatic promotion needs 10 perfect games in a row. Most people will sit on one setting forever, either bored or frustrated.

**Long option names truncate** ("Saint Vincent and the Gre...") in the Home 2x2 grid.

### The fix

**A. The "Learn moment" on every miss.** Replace auto-advance on wrong answers with a compact card that stays until tapped:

- Your pick and the right answer, both flags side by side, labelled.
- One line on how to tell them apart. Seed this from a new `flagTells` data table (for twins: "Chad is darker blue, Romania brighter"; for others: a single memorable detail, "the only flag with a map on it").
- Button: "Got it" (gold). Optional "Add to review" is automatic anyway via the urgent lane.
- Correct answers keep the fast 600ms auto-advance. Timed mode keeps auto-advance on both (shows the card in Results instead).

This is the single most impactful change for actual learning, and it makes misses feel useful instead of punishing. It moves the comparison that #142 already added to Results into the moment it matters; the Results list can then shrink to a summary.

Trade-off: a tap per miss slows fast players. Keep it to one tap, never on correct answers, skip it in Timed, and add a Settings toggle ("Show tips on misses", default on). Daily and challenge times are measured before the card appears, so leaderboards are unaffected.

**B. Smart distractors for every flag.** Add a small per-flag descriptor table, `src/data/flagTraits.ts`:

```ts
{ id: 'td', colors: ['blue','yellow','red'], layout: 'vertical-tricolor', emblem: false }
```

Then `generateOptions` picks wrong answers in priority order: explicit twins, then same layout plus overlapping colors, then same region, then random. Difficulty controls how deep into that list we go: Easy = random region, Medium = same region, Hard = look-alikes. This makes "Medium" mean something and makes the game get genuinely harder as you improve.

**C. Points, combo, and a personal best.**

- 100 points per correct, plus speed bonus (up to +50 under 2s, using existing `SPEED_FAST_MS`), times a combo multiplier (x1, x2 at 3 in a row, x3 at 6). Combo shows as a gold pill that grows with a spring (reuse `useGameAnimations.animateStreak`).
- Results hero becomes the score with a "New best" flag per mode, accuracy moves to the secondary line. A 30% round can still be a personal best on speed or combo, which keeps people playing.
- Share text leads with score and combo, keeps the grid.

**D. Adaptive difficulty inside the round.** Move the Difficulty selector off Home and into Customize (it is still needed for challenge links, which encode difficulty, and for players who like to choose). The default "Play" adapts instead. Each round starts at the player's recent level and steps distractor depth up after 3 correct, down after 2 misses. Hard (typing) stays as an explicit opt-in mode for people who want it. This replaces the skill level system from area 1. The Daily and challenges stay fixed-difficulty so scores between players remain comparable.

**E. Small polish fixes in the same pass**

- Options: allow 2 lines and shrink font before truncating (`numberOfLines={2}`), or use the vertical list on Home too.
- Game screen has a large empty band above the flag on tall phones; anchor the flag closer to the top bar and give the options more room.

### Implementation plan

1. `src/data/flagTraits.ts` (197 entries; colors, layout, emblem). Unit test that every flag has an entry.
2. `src/data/flagTells.ts` (start with the 81 twin flags, then expand). Missing tell falls back to "Look for: {colors} {layout}" generated from traits, so every flag has something.
3. `gameEngine.ts`: `rankDistractors(flag, pool, depth)` and use it in `generateOptions` and `generateDailyQuestions`. Tests for each depth.
4. `src/components/LearnCard.tsx` shared by `GameScreen`, `FlagPuzzleScreen`, `CapitalConnectionScreen`. Change the wrong-answer branch of `handleAnswer` to wait for "Got it" instead of `setTimeout(goToNext)`.
5. `src/utils/scoring.ts`: `scoreAnswer({ correct, timeTaken, combo })`, `getComboMultiplier(combo)`. Store `bestScoreByMode` in `UserStats` (additive field, default empty).
6. `GameTopBar`: show score and combo pill. `ResultsScreen` hero: score first.
7. Remove `MODE_KEYS` difficulty row from Home; add `getRecentDepth()` in storage.
8. i18n for all new strings and all tells, 6 locales.

**Success metrics**: accuracy on previously missed flags in later sessions (should rise), average rounds per session, % of rounds ending in "New best".

---

## 3. First run and Home: one obvious next action

### What is wrong

**Onboarding asks before it delights.** First screen: a giant "Welcome to your flag knowledge" headline (awkward phrasing), then 5 choices: Give it a try, See Where You Stand, Choose Your Own Game, Practice, Timed Quiz. "See Where You Stand" starts a 54-flag Africa test as the first thing a new player does. "Practice" here opens Browse, while "Practice" everywhere else means "review weak flags".

**Home has two mini-quizzes, two settings rows and a long mode list on one screen.** From top: wordmark + Level 0 pill, a Cards selector (5/10/15/20/All), a Difficulty selector, a "Name this flag" teaser with 4 options, Play Now, a Fact of the Day quiz with its own options, then a list of up to 7 modes, then the baseline progress card. The teaser and Play Now compete: you answer the teaser, then Play Now starts a different game with different flags.

**Mode naming and placement are inconsistent.**

- "Capital Connection" on Home and Levels, "Capital Quiz" on the Modes screen.
- Flag Impostor is on Home but missing from the Modes screen, and Neighbors is on the Modes screen but missing from Home.
- "Quiz", "Medium", "Play Now" all mean the same thing.
- "Join challenge" sits in the game mode list as if it were a mode.

**Results after the Daily has no next game.** The only action is Share; to keep playing you go back to Home and choose again. That is the moment a player is most warmed up.

### The fix

**A. Zero-menu first run.** Launch straight into a 5-flag round of famous flags (`easy_flags` category, 2 choices for the first two, then 4). No menu, no welcome wall. One line of copy above the first flag: "Name this flag." After round 1:

- "You collected 4 countries." Stamps animate into an empty Passport.
- "Want a daily reminder to keep your streak?" Today reminders exist only as an off-by-default toggle in Settings, so almost nobody has them. Asking here, right after a win, is the standard moment to get a yes. Turning it on calls the existing `toggleDailyReminder`.
- Then Home.

Placement is folded into play: the first 3 rounds adapt (area 2D), so we never need a 54-flag test. Remove the baseline flow from onboarding; region pages in the Passport replace it.

**B. Home with one hero and one shelf.** Top to bottom:

1. Header: wordmark left, streak pill right.
2. **Today card**: daily goal ring ("6 / 10 today"), the Daily Challenge button (or "Done, back tomorrow" with your score), Passport count "84 / 197". This is the reason to open the app.
3. **Play** (gold hero button): "Continue" runs a 10-flag adaptive round from your Passport (mix of new flags and reviews). No settings needed. Long-press or a small "Customize" link opens the existing GameSetup sheet for region/length/hard mode.
4. **Modes shelf**: horizontal cards, all 7 modes, same names as everywhere else, each showing your best score.
5. **Fact of the Day**: keep, but as a single read card below the fold (it already has a quiz mode in GeoFacts).

Remove from Home: the Cards selector, the Difficulty selector, the teaser quiz (its job moves to first run), the baseline card, and "Join challenge" (moves to a "Have a code?" link on the Challenges area and is handled by deep links anyway).

**C. One vocabulary.** Settle names once in `en.ts` and use them everywhere:

| Concept | Name |
|---------|------|
| Standard round | Classic |
| Timed | Speed Run |
| Puzzle | Flag Puzzle |
| Capitals | Capitals |
| Neighbors | Neighbors |
| Impostor | Spot the Fake |
| Weak flags | Review |
| Browse all flags | Atlas |
| Stats | Passport |

Every mode appears in exactly one list (the Modes tab) plus the Home shelf. Bottom nav becomes: Home, Play, Passport, Atlas, Settings.

**D. Every Results screen has a next step.** Primary button is always "Keep going" (next adaptive round). After the Daily: "Keep going" plus "Share". If there are flags in review: "Review 4 flags" as the secondary.

**E. Brand.** Keep the name "Flag That". It is short, says what it is, the domain `flagthat.app` is owned, and it works as a verb ("flag that"). Changing it would cost store listing, domain and link continuity for little gain. Instead, sharpen what it stands for:

- Tagline: "Collect the world, one flag at a time." (replaces "How well do you know the world?")
- The Passport gives the brand a visual system: ink stamps, region pages, a stamp shape for the app icon and share cards. All flat, no gradients, fits the existing parchment, ink and gold palette.
- Use the stamp motif in the share image (rank, streak, "84 / 197") so shares look like a passport page, not a grid of squares. This is the most shareable asset the app can have.
- Housekeeping: the bundle id and package name are still `com.flagsareus.app` and the npm name `flagsareus`. Decide before first App Store submission; bundle ids cannot be changed after release.

### Implementation plan

1. `OnboardingScreen.tsx`: replace the action grid with a direct `navigation.reset` into a 5-flag `easy_flags` round, then a new `FirstRunResults` variant of Results (stamps + reminder prompt). Delete baseline entry points from onboarding and Home.
2. `HomeScreen.tsx`: rebuild as header, `TodayCard`, Play hero, `ModeShelf`, `FactOfDay`. Move the modes array into a shared `src/utils/modes.ts` registry (`id, nameKey, icon, accent, route, buildConfig`) consumed by Home shelf, GameSetup grid, Results "play again" and levels/badges. This fixes the naming drift and the missing Impostor at the source.
3. `BottomNav.tsx` + `useNavTabs.ts`: new tab set and labels.
4. `ResultsScreen.tsx` (1,331 lines): split into `ResultsHero`, `ResultsReview`, `ResultsActions`; add "Keep going" everywhere.
5. Share image: render a passport-page card with `react-native-svg` and share as an image where supported, text fallback otherwise.
6. i18n: new names and tagline across all 6 locales; remove orphaned keys.

**Success metrics**: % of installs who finish round 1 (target over 90%), time from launch to first answer (target under 3 seconds), taps from Home to first question (target 1).

---

## Suggested order

| Phase | Work | Why first |
|-------|------|-----------|
| 0 | Decide how to measure (see "Measuring any of this") | Otherwise none of the targets can be checked |
| 1 | Learn card, smart distractors, streak pill on Home, reminder prompt after a good round, fix Level 1 requirement as a stopgap | Small, high impact, no new navigation |
| 2 | Passport (data, Stats tab, Results stamps), daily goal, streak freeze | The retention backbone |
| 3 | Zero-menu first run, Home rebuild, mode registry, renames | Depends on Passport for the Today card |
| 4 | Scoring and combo, weekday Daily, passport share card | Polish that compounds the above |

A stopgap worth doing immediately regardless of the rest: change Level 1 in `levels.ts` to count correct answers in any mode (`total_correct`) with a small target like 25, so new players stop seeing "Level 0".

## Measuring any of this

Every success metric above assumes we can see what players do, and today we cannot. The app is local-first, the iOS privacy manifest declares no collected data, and the only analytics is `@vercel/analytics` on the web build, which counts page views, not game events. Native players are invisible.

Two options, pick one before phase 1 ships:

1. **Add minimal, anonymous event analytics** (round started/finished, rank up, daily done, reminder opted in). This requires updating the App Store privacy label and the privacy manifest, and choosing a provider. Best data, real cost.
2. **Measure on web only, plus store data.** Instrument the same events through Vercel on the web build, and use App Store Connect / Play Console retention for native. Free and private, but only directional.

Without one of these, the plan can still ship, but the targets in this doc are guesses we will not be able to check.

## Smaller issues noticed along the way

- The first Daily share asks for a name before the share sheet opens.
- Home teaser answers are not recorded anywhere. Fact of the Day answers are saved, but only for the fact card itself, not toward flag progress.
- `GAME_MODES` and `CATEGORIES` in `src/types/index.ts` carry hardcoded English labels alongside the i18n keys.
- Flags load from flagcdn.com at runtime. `FlagImage` retries and then offers a manual retry, which is good, but with no connection the core game cannot be played at all. Bundling small flag images would match the local-first architecture.
- `ResultsScreen.tsx` and `StatsScreen.tsx` are over 1,200 lines each, which will slow down all of the above; splitting them is part of the plan.
