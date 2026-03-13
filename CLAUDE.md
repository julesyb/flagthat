# Flag That - Development Guidelines

## Design System

### Typography
- **Two font families only** — no exceptions.
  - `LibreBaskerville` — display/editorial headings, wordmark, big numbers
  - `Barlow` — everything else (body, labels, buttons, gameplay, UI)
- Homepage wordmark ("FlagThat") uses LibreBaskerville at ~23px, single line. "Flag" in ink, "That" in italic gold.

### Visual Rules
- Rounded corners on cards and interactive elements (sm-xl scale).
- No gradients. Flat color planes.
- No drop shadows except offset hard shadows on CTA buttons.
- Gold (`colors.goldBright` / `colors.gold`) is the primary CTA accent color.
- Red reserved for errors, hard difficulty, and wrong-answer feedback.
- No emoji anywhere in the UI. Use SVG icons from `src/components/Icons.tsx`.
- No em dashes in user-facing text. Use hyphens or commas.
- No circles in procedurally generated fake flags (impostor mode).

### Colors
- All colors defined in `src/utils/theme.ts` — single source of truth.
- Warm-neutral palette: warm parchment background, midnight ink text, gold CTA accent, green/red/blue/purple pops.
- Dark surfaces use `colors.ink` (#1A1820).
- Background uses `colors.background` (#F5EFE6).
- Primary CTA buttons use `colors.gold` (#9A5C0A) with white text.
- Streak indicators and active states use `colors.goldBright` (#E9BA4C).
- Difficulty colors: Easy=green, Medium=gold, Hard=red (use `colors.diffEasy/diffMedium/diffHard`).
- Game mode bars use `colors.modeRed/modeGold/modeBlue/modeGreen/modePurple`.

### Component Patterns
- **Streak badge**: Pill with streak number + "Day streak" label + pip dots (max 7).
- **Play/CTA button**: Gold background, white text, hard shadow below.
- **Difficulty buttons**: 3-column grid, colored when active (green/gold/red).
- **Mode list**: Rows with colored sidebar bar (3px), title, tag, and chevron.
- **Stats hero**: 3-column card (streak/accuracy/mastered) with dividers.
- **Bottom nav**: Gold active indicator bar at top of active tab.
- **Region/filter chips**: Gold background when active.

## Architecture
- React Native / Expo SDK 55 (iOS, Android, Web)
- Local-first: all data stored via AsyncStorage, no backend
- Navigation: React Navigation native stack
- State: local component state + AsyncStorage persistence
- Theme: 3 modes (light/dark/system) via `ThemeContext` + `useTheme()` hook
- i18n: 6 locales (en, fr, es, de, pt-BR, zh) via `t(key)` function from `src/utils/i18n.ts`
- Responsive: `useLayout()` hook provides `contentWidth`, `gameWidth`, `isTablet`, `isDesktop`

## Key Files
- `src/utils/theme.ts` — colors, spacing, typography, font families, `buildButtons()`, `buildNav()`, `shadows`, `layout`
- `src/utils/storage.ts` — all AsyncStorage persistence
- `src/utils/gameEngine.ts` — question generation, scoring, daily challenge
- `src/utils/badges.ts` — badge definitions and evaluation engine
- `src/utils/feedback.ts` — sound and haptics with runtime toggles
- `src/utils/i18n.ts` — translation system, `t(key)` with interpolation
- `src/utils/useLayout.ts` — responsive breakpoints hook
- `src/utils/notifications.ts` — daily reminder scheduling
- `src/utils/challengeCode.ts` — URL-safe challenge encoding/decoding
- `src/utils/config.ts` — app domain, game constants, challenge limits
- `src/utils/levels.ts` — 10-level progression system with requirement types and evaluation
- `src/utils/gameHelpers.ts` — helper functions (countCorrect, countWrong, calculateProgress)
- `src/hooks/useGameAnimations.ts` — shared game animation hook (fade, shake, streak spring)
- `src/hooks/useCountdown.ts` — countdown timer hook for timed game modes
- `src/hooks/useNavTabs.ts` — navigation tab state management
- `src/components/Icons.tsx` — all SVG icons (no emoji)
- `src/components/BottomNav.tsx` — shared bottom navigation
- `src/components/ScreenContainer.tsx` — max-width wrapper for responsive layout
- `src/components/SegBtn.tsx` — segmented button component
- `src/components/ConfigRow.tsx` — settings row with label + controls
- `src/components/FlagImage.tsx` — optimized flag image loading with CDN width selection
- `src/components/MapImage.tsx` — country/region map display
- `src/components/GameTopBar.tsx` — game screen header with score, streak, progress
- `src/components/PageHeader.tsx` — screen title and subtitle header
- `src/components/ErrorBoundary.tsx` — error boundary wrapper for crash recovery
- `src/components/AppIcon.tsx` — app icon display component
- `src/contexts/ThemeContext.tsx` — theme provider with light/dark/system support

## Conventions
- DRY: shared components in `src/components/`, shared logic in `src/utils/`
- BottomNav on all non-game screens (Home, Stats, Settings, Browse, Results, GameSetup)
- All screens use SafeAreaView with `colors.background`
- Game screens have Exit button + no bottom nav
- TypeScript strict mode, no `any` types

### Styling
- Every screen defines a `createStyles(colors: ThemeColors)` function returning `StyleSheet.create({...})`
- Styles are memoized in component: `const styles = useMemo(() => createStyles(colors), [colors])`
- Buttons use `buildButtons(colors)` from theme.ts: `btn.primary`, `btn.primaryText`, `btn.secondary`, `btn.secondaryText`
- Navigation buttons use `buildNav(colors)` from theme.ts

### Layout Patterns
- 2-column rows: `flexDirection: 'row'` + `gap: spacing.sm` container, children get `flex: 1`
- 3-column rows: same pattern (e.g. difficulty grid, theme options)
- Wrap grids: `flexDirection: 'row'` + `flexWrap: 'wrap'` + `gap: spacing.sm`

### i18n
- All user-facing text must use `t(key)` - never hardcode strings
- Translation keys defined in `src/locales/en.ts`, other locales in same directory
- Interpolation: `t('results.score', { correct: 5, total: 10 })`
- **Every new or changed translation key must be added to ALL 6 locale files** (en, fr, es, de, pt-BR, zh). Never add a key to en.ts without adding the corresponding translation to every other locale.
- After any change involving user-facing text, verify that no English strings leak through when switching languages. Treat untranslated strings as bugs.

### Dynamic and Reusable Components
- All new UI should be dynamic and data-driven. Avoid hardcoding values, labels, or lists that could change.
- Before creating new components, check if an existing component in `src/components/` can be reused or extended.
- When adding new features, review surrounding code for opportunities to extract reusable components or shared utilities.
- Prefer configuration and props over duplication. If the same UI pattern appears more than once, extract it into a shared component.

### Accessibility
- All interactive elements need `accessibilityRole="button"` and `accessibilityLabel={t(...)}`
- Selection state: `accessibilityState={{ selected: isActive }}`
- Tab bars use `accessibilityRole="tablist"` / `"tab"`

### Sound and Haptics
- Import helpers from `src/utils/feedback.ts`: `hapticTap()`, `hapticCorrect()`, `hapticWrong()`
- Call `hapticTap()` on button presses
- Sound/haptic toggles are runtime-configurable via settings

### Testing
- Jest for unit tests, test files in `__tests__/` directories
- Run with `npx jest`
