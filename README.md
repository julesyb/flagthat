# Flag That

A mobile flag quiz app built with React Native and Expo. Test your knowledge of 195+ country flags across multiple game modes on iOS, Android, and web.

## Game Modes

- **Quick Play** - Choose 2 Pick, 4 Pick, or Free-form and hit Play Now
- **Full Game Setup** - Pick difficulty, display mode (flag or map), category filter, question count, lives (3/5/unlimited)
- **Timed Quiz** - 60 seconds, answer as many as you can
- **Flag Puzzle** - Flag reveals tile by tile, guess before time runs out
- **Neighbors** - Name all bordering countries of a given flag
- **Flag Impostor** - Spot the fake flag among real ones
- **Capital Connection** - Match flags to their capital cities

### Categories

Filter by region (Africa, Asia, Europe, Americas, Oceania) or theme (Famous Flags, Tricky Twins, Island Nations, Top Destinations, Short Names).

## Tech Stack

- **React Native** 0.83 + **Expo** 55 + **TypeScript** 5.9 (strict)
- **React Navigation** (native-stack) for routing
- **AsyncStorage** for persistent stats
- **expo-image** for performant flag loading via flagcdn.com
- **expo-av** / **expo-haptics** / **expo-sensors** for audio, haptics, and accelerometer
- **Vercel** for web deployment

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v18+)
- [Expo Go](https://expo.dev/go) app on your phone (for testing on device)

### Install

```bash
npm install
```

### Run

```bash
npm start
```

This opens the Expo dev menu. From there:

- Scan the QR code with Expo Go (Android) or Camera app (iOS)
- Press `a` for Android emulator
- Press `i` for iOS simulator
- Press `w` for web browser

### Platform-specific

```bash
npm run android
npm run ios
npm run web
```

### Build for production (web)

```bash
npm run build:web
```

Output goes to `dist/`, deployed via Vercel.

## Project Structure

```
App.tsx                  # Root component, font loading, navigation
src/
  screens/               # All app screens (one per game mode + home, results, stats, browse)
    HomeScreen.tsx        # Landing page, quick play, flag teaser, stats preview
    GameScreen.tsx        # Main quiz (easy, medium, hard, timed)
    GameSetupScreen.tsx   # Full game configuration
    ResultsScreen.tsx     # Post-game results and grade
    StatsScreen.tsx       # Lifetime statistics
    BrowseScreen.tsx      # Browse all flags
    FlagPuzzleScreen.tsx  # Progressive flag reveal
    NeighborsScreen.tsx   # Find bordering countries
    FlagImpostorScreen.tsx # Spot the fake flag
    CapitalConnectionScreen.tsx # Match flags to capitals
    FlagFlashScreen.tsx   # Party tilt-to-answer mode (hidden)
  components/            # Shared UI (FlagImage, MapImage, BottomNav, Icons, ErrorBoundary)
  data/                  # Country database (195+ countries), capitals, neighbors, aliases, coordinates
  hooks/                 # Custom hooks (useGameAnimations)
  utils/                 # Game engine, storage, theme, audio/haptic feedback
  types/                 # TypeScript types and navigation params
assets/
  sounds/                # Audio effects
  icons/                 # App icons and splash screens
```

## Design System

### Typography

Two font families only:

- **LibreBaskerville** - Display / editorial headings (Flag That wordmark, big stat numbers)
- **Barlow** - Everything else (body text, labels, buttons, gameplay UI)

### Rules

- Rounded corners on cards and interactive elements (sm-xl scale)
- No gradients - flat color planes only
- No drop shadows except offset hard shadows on hover
- Accent red (#E5271C) appears maximum twice per screen
- No emoji anywhere in the UI - use SVG icons from Icons.tsx
- No em dashes in user-facing text - use hyphens or commas
