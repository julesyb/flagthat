# CLAUDE.md

This file provides guidance for AI assistants working on Flag That.

## Project Overview

Flag That is a mobile flag quiz app built with React Native, Expo, and TypeScript. It supports iOS, Android, and web. Users identify country flags across 9 game modes with 195+ countries.

## Commands

```bash
npm start              # Start Expo dev server
npm run android        # Run on Android emulator/device
npm run ios            # Run on iOS simulator/device
npm run web            # Run in web browser
npm run build:web      # Export for web production (Vercel)
```

There is no test runner, linter, or formatter configured. TypeScript strict mode is the primary code quality gate.

## Architecture

```
App.tsx                  # Root: font loading, navigation setup
index.ts                 # Expo entry point
src/
  screens/               # One file per screen/game mode (~5,400 lines total)
  components/            # Shared UI (FlagImage, MapImage, BottomNav, Icons, ErrorBoundary)
  data/                  # Country database, capitals, neighbors, aliases, coordinates
  hooks/                 # Custom hooks (useGameAnimations)
  utils/                 # Game engine, AsyncStorage persistence, theme, audio/haptic feedback
  types/                 # TypeScript types and navigation param definitions
assets/
  sounds/                # Audio effects (correct, wrong, tick, start, celebration)
  icons/                 # App icons, splash screens
```

### Key Files

- `src/types/index.ts` - Core types: GameMode, FlagItem, GameConfig, UserStats, category definitions
- `src/types/navigation.ts` - Type-safe React Navigation route params (RootStackParamList)
- `src/data/countries.ts` - 195+ countries with id, name, emoji, region, tags
- `src/data/countryAliases.ts` - 600+ alternate names and common misspellings
- `src/utils/gameEngine.ts` - Question generation, answer checking, scoring logic
- `src/utils/storage.ts` - AsyncStorage persistence for stats and per-flag performance
- `src/utils/theme.ts` - Design system: colors, spacing, typography, shadows
- `src/utils/feedback.ts` - Audio playback and haptic vibration helpers
- `src/components/FlagImage.tsx` - Flag rendering via flagcdn.com CDN
- `src/components/Icons.tsx` - SVG icon library (all custom, no icon packages)

### Navigation

Stack navigator via `@react-navigation/native-stack`. Routes are defined in `src/types/navigation.ts`. Game config is passed via navigation params. `BottomNav` provides persistent tab navigation (Play, Modes, Stats, Browse).

### State Management

- **In-game state:** React hooks (useState, useRef for performance-critical values)
- **Persistent data:** AsyncStorage for lifetime stats, per-flag performance, day streaks
- **No external state library** (no Redux, Zustand, etc.)

### Game Modes

| Mode | Type | Screen File |
|------|------|-------------|
| Easy (2 Pick) | Multiple choice | GameScreen.tsx |
| Medium (4 Pick) | Multiple choice | GameScreen.tsx |
| Hard (Free-form) | Type answer | GameScreen.tsx |
| Timed Quiz | 60s race | GameScreen.tsx |
| FlagFlash | Tilt-to-answer party mode | FlagFlashScreen.tsx (hidden) |
| Flag Puzzle | Progressive reveal | FlagPuzzleScreen.tsx |
| Neighbors | Name bordering countries | NeighborsScreen.tsx |
| Flag Impostor | Spot the fake | FlagImpostorScreen.tsx |
| Capital Connection | Match flag to capital | CapitalConnectionScreen.tsx |

Easy, Medium, Hard, and Timed Quiz all share `GameScreen.tsx` with behavior driven by `GameConfig.mode`.

### Categories

- **Regional:** africa, asia, europe, americas, oceania
- **Themed:** easy_flags (Famous Flags), tricky_twins, island_nations, top_travel, short_names

Countries are tagged in `src/data/countries.ts`. Use `getFlagsForCategory()` from `src/data/index.ts` to filter.

## Code Conventions

### TypeScript

- Strict mode enabled. Do not use `any`.
- PascalCase for components, types, and interfaces.
- camelCase for functions, variables, and utility files.
- All navigation routes must be typed in `RootStackParamList`.

### React Patterns

- Functional components only. No class components.
- Use `useRef` for values that change frequently but should not trigger re-renders (timers, counters in game loops).
- Use `Animated` API with `useNativeDriver: true` for animations.
- Custom animation hook: `useGameAnimations` in `src/hooks/`.

### Design System Rules

These rules are strict and must be followed in all UI changes:

- **Two fonts only:** LibreBaskerville_700Bold (display/editorial headings, big stat numbers) and Barlow family (everything else: 300-600 weights).
- **No gradients.** Flat color planes only.
- **No drop shadows** except offset hard shadows on hover states.
- **Accent red (#E5271C)** appears maximum 2 times per screen.
- **No emoji in UI.** Use SVG icons from `src/components/Icons.tsx`.
- **No em dashes** in user-facing text. Use hyphens or commas.
- **Rounded corners** on cards and interactive elements (8/10/14/18px scale).

### Color Palette

```
Primary (ink):    #111827
Accent red:       #E5271C
Success:          #16A34A
Error:            #DC2626
Warning:          #D97706
Info:             #2563EB
Surface white:    #FFFFFF
Surface paper:    #F9FAFB
Surface paperDark:#F3F4F6
```

### Spacing Scale

xxs=2, xs=4, sm=8, md=16, lg=24, xl=32, xxl=48

### Adding a New Country

1. Add entry to `src/data/countries.ts` with id (ISO 3166-1 alpha-2 lowercase), name, emoji, region, tags.
2. Add aliases to `src/data/countryAliases.ts` if the country has alternate names.
3. Add neighbors to `src/data/countryNeighbors.ts` if the Neighbors mode should include it.
4. Add capital to `src/data/countryCapitals.ts` for Capital Connection mode.
5. Add coordinates to `src/data/countryCoordinates.ts` for map display mode.

### Adding a New Game Mode

1. Define the mode in `GameMode` type in `src/types/index.ts`.
2. Add entry to `GAME_MODES` constant in the same file.
3. Create a new screen file in `src/screens/` or extend `GameScreen.tsx`.
4. Add navigation route to `RootStackParamList` in `src/types/navigation.ts`.
5. Register the screen in the navigator in `App.tsx`.
6. Add mode card to `HomeScreen.tsx` game mode section.

### External Services

- **Flag images:** flagcdn.com CDN (`https://flagcdn.com/w{size}/{code}.png`)
- **Map tiles:** CartoDB basemap tiles for map display mode
- **Deployment:** Vercel (web export)

## Deployment

Web builds are exported with `npm run build:web` (runs `expo export --platform web`). Output goes to `dist/`. Vercel config in `vercel.json` rewrites all routes to `/` for SPA behavior.

Mobile builds use Expo's build system (EAS Build for production).
