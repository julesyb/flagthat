# Flag That

A mobile flag quiz app built with React Native and Expo. Test your knowledge of 195+ country flags across multiple game modes.

## Game Modes

- **Quick Play** - Choose 2 Pick, 4 Pick, or Free-form, hit Play Now
- **Game Mode** - Full control: pick difficulty, display mode (flag or map), category filter, question count, lives (3 default, 5, or unlimited)
- **Timed Quiz** - 60 seconds, answer as many as you can
- **FlagFlash** - Party mode, hold phone on forehead, tilt to answer
- **Flag Puzzle** - Flag reveals tile by tile, guess before time runs out
- **Browse** - Explore all flags in the database

## Design System

### Typography

Two font families only:

- **LibreBaskerville** - Display / editorial headings (Flag That wordmark, big stat numbers)
- **Barlow** - Everything else (body text, labels, buttons, gameplay UI)

### Rules

- Rounded corners on cards and interactive elements (sm-xl scale)
- No gradients. Flat color planes
- No drop shadows except offset hard shadows on hover
- Accent red appears maximum twice per screen
- No emoji anywhere in the UI. Use SVG icons from Icons.tsx
- No em dashes in user-facing text. Use hyphens or commas

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

## Project Structure

```
App.tsx              # Root component, font loading, navigation
src/
  screens/           # All app screens
    HomeScreen       # Landing page with flag teaser, quick play, stats
    GameScreen       # Main quiz (easy, medium, hard, timeattack)
    FlagFlashScreen  # Party tilt-to-answer mode
    FlagPuzzleScreen # Progressive flag reveal mode
    GameSetupScreen  # Full game configuration
    ResultsScreen    # Post-game results and grade
    StatsScreen      # Lifetime statistics
    BrowseScreen     # Browse all flags
  components/        # Reusable components (FlagImage, MapImage, BottomNav, Icons)
  data/              # Country flag data (195+ countries)
  hooks/             # Custom hooks (useGameAnimations)
  utils/             # Game engine, storage, theme, haptics/audio feedback
  types/             # TypeScript types and navigation params
assets/
  sounds/            # Game audio effects (correct ding, wrong, tick, start, celebration)
```
