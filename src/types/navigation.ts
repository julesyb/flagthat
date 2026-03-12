import { GameConfig, GameResult, GameMode } from './index';
import { ChallengeData } from '../utils/challengeCode';

export type RootStackParamList = {
  Onboarding: undefined;
  Home: undefined;
  GameSetup: { initialMode?: GameMode; initialDifficulty?: 'easy' | 'medium' | 'hard' } | undefined;
  Game: { config: GameConfig; challenge?: ChallengeData; playerName?: string };
  FlashFlag: { config: GameConfig };
  FlagPuzzle: { config: GameConfig; challenge?: ChallengeData; playerName?: string };
  Neighbors: { config: GameConfig; challenge?: ChallengeData; playerName?: string };
  FlagImpostor: { config: GameConfig };
  CapitalConnection: { config: GameConfig; challenge?: ChallengeData; playerName?: string };
  Results: { results: GameResult[]; config: GameConfig; reviewOnly?: boolean; challenge?: ChallengeData; playerName?: string };
  Stats: { highlightChallenge?: string } | undefined;
  Settings: undefined;
  Browse: { region?: string } | undefined;
  JoinChallenge: { code?: string } | undefined;
  ChallengeResponse: { code?: string } | undefined;
};
