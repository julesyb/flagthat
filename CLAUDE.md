# Flag That - Development Guidelines

## Design System

### Typography
- **Two font families only** — no exceptions.
  - `LibreBaskerville` — display/editorial headings, wordmark, big numbers
  - `Barlow` — everything else (body, labels, buttons, gameplay, UI)
- Homepage wordmark ("Flag That") uses LibreBaskerville at 36px.

### Visual Rules
- Rounded corners on cards and interactive elements (sm-xl scale).
- No gradients. Flat color planes.
- No drop shadows except offset hard shadows on hover states.
- Accent red (#E5271C) appears maximum twice per screen.
- No emoji anywhere in the UI. Use SVG icons from `src/components/Icons.tsx`.
- No em dashes in user-facing text. Use hyphens or commas.
- No circles in procedurally generated fake flags (impostor mode).

### Colors
- All colors defined in `src/utils/theme.ts` — single source of truth.
- Dark surfaces use `colors.ink` (#111827).
- Background uses `colors.background` (#F9FAFB).

## Architecture
- React Native / Expo SDK 55 (iOS, Android, Web)
- Local-first: all data stored via AsyncStorage, no backend
- Navigation: React Navigation native stack
- State: local component state + AsyncStorage persistence

## Key Files
- `src/utils/theme.ts` — colors, spacing, typography, font families
- `src/utils/storage.ts` — all AsyncStorage persistence
- `src/utils/gameEngine.ts` — question generation, scoring, daily challenge
- `src/utils/badges.ts` — badge definitions and evaluation engine
- `src/utils/feedback.ts` — sound and haptics with runtime toggles
- `src/components/Icons.tsx` — all SVG icons (no emoji)
- `src/components/BottomNav.tsx` — shared bottom navigation

## Conventions
- DRY: shared components in `src/components/`, shared logic in `src/utils/`
- BottomNav on all non-game screens (Home, Stats, Settings, Browse, Results, GameSetup)
- All screens use SafeAreaView with `colors.background`
- Game screens have Exit button + no bottom nav
- TypeScript strict mode, no `any` types
