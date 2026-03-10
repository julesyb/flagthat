# Flag That

A mobile flag guessing game built with React Native and Expo. Test your knowledge of 195+ country flags across multiple game modes.

## Game Modes

- **Quick Play** — 10 famous flags, 50/50 choices, jump right in
- **Custom Game** — Pick your mode, category, and question count
- **Heads Up** — Hold the phone to your forehead, tilt to answer (party mode)
- **Browse** — Explore all flags in the database

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
App.tsx              # Root component + navigation
src/
  screens/           # All app screens (Home, Game, Results, Stats, Browse, etc.)
  components/        # Reusable components (FlagImage, ErrorBoundary)
  data/              # Country flag data (195+ countries)
  utils/             # Game logic, storage, theme, haptics/audio
  types/             # TypeScript types
assets/
  sounds/            # Game audio effects
```
