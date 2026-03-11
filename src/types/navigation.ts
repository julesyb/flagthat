import { GameConfig, GameResult } from './index';

export type RootStackParamList = {
  Onboarding: undefined;
  Home: undefined;
  GameSetup: undefined;
  Game: { config: GameConfig };
  FlagFlash: { config: GameConfig };
  FlagPuzzle: { config: GameConfig };
  Neighbors: { config: GameConfig };
  FlagImpostor: { config: GameConfig };
  CapitalConnection: { config: GameConfig };
  Results: { results: GameResult[]; config: GameConfig };
  Stats: undefined;
  Settings: undefined;
  Browse: { region?: string } | undefined;
};
