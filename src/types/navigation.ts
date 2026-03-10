import { GameConfig, GameResult } from './index';

export type RootStackParamList = {
  Home: undefined;
  GameSetup: undefined;
  Game: { config: GameConfig };
  FlagFlash: { config: GameConfig };
  Results: { results: GameResult[]; config: GameConfig };
  Stats: undefined;
  Browse: { region?: string } | undefined;
};
