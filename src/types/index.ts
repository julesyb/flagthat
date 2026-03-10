export type Difficulty = 'easy' | 'hard' | 'extreme';

export type FlagCategory = 'countries' | 'us_states' | 'canadian_provinces' | 'australian_states' | 'brazilian_states' | 'german_states' | 'indian_states' | 'japanese_prefectures' | 'mexican_states' | 'spanish_communities';

export interface FlagItem {
  id: string;
  name: string;
  emoji: string;
  category: FlagCategory;
  region?: string;
}

export interface GameConfig {
  difficulty: Difficulty;
  categories: FlagCategory[];
  questionCount: number;
}

export interface GameQuestion {
  flag: FlagItem;
  options: string[]; // Only used for easy/hard modes
}

export interface GameResult {
  question: GameQuestion;
  userAnswer: string;
  correct: boolean;
  timeTaken: number;
}

export interface GameSession {
  config: GameConfig;
  results: GameResult[];
  startTime: number;
  endTime?: number;
  score: number;
  totalQuestions: number;
}

export interface UserStats {
  totalGamesPlayed: number;
  totalCorrect: number;
  totalAnswered: number;
  bestStreak: number;
  categoryStats: Record<FlagCategory, { correct: number; total: number }>;
  difficultyStats: Record<Difficulty, { correct: number; total: number }>;
}

export const CATEGORY_LABELS: Record<FlagCategory, string> = {
  countries: 'Countries',
  us_states: 'US States',
  canadian_provinces: 'Canadian Provinces',
  australian_states: 'Australian States',
  brazilian_states: 'Brazilian States',
  german_states: 'German States',
  indian_states: 'Indian States',
  japanese_prefectures: 'Japanese Prefectures',
  mexican_states: 'Mexican States',
  spanish_communities: 'Spanish Communities',
};

export const DIFFICULTY_CONFIG: Record<Difficulty, { label: string; description: string; choiceCount: number }> = {
  easy: { label: 'Easy', description: '2 choices', choiceCount: 2 },
  hard: { label: 'Hard', description: '4 choices', choiceCount: 4 },
  extreme: { label: 'Extreme', description: 'Type the answer', choiceCount: 0 },
};
