import { GameConfig, GameResult } from './index';

export type RootStackParamList = {
  Home: undefined;
  GameSetup: undefined;
  Game: { config: GameConfig };
  Results: { results: GameResult[]; config: GameConfig };
  Stats: undefined;
  Browse: undefined;
};
