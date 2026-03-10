export type GameMode = 'easy' | 'medium' | 'hard' | 'headsup';

export type CategoryType = 'region' | 'theme';

export type CategoryId =
  | 'all'
  | 'africa'
  | 'asia'
  | 'europe'
  | 'americas'
  | 'oceania'
  | 'easy_flags'
  | 'tricky_twins'
  | 'island_nations'
  | 'top_travel'
  | 'short_names';

export interface CategoryInfo {
  id: CategoryId;
  label: string;
  description: string;
  type: CategoryType;
  icon: string;
}

export interface FlagItem {
  id: string;
  name: string;
  emoji: string;
  region: string;
  tags: CategoryId[];
}

export interface GameConfig {
  mode: GameMode;
  category: CategoryId;
  questionCount: number;
  timeLimit?: number; // seconds, for heads up
}

export interface GameQuestion {
  flag: FlagItem;
  options: string[];
}

export interface GameResult {
  question: GameQuestion;
  userAnswer: string;
  correct: boolean;
  timeTaken: number;
}

export interface UserStats {
  totalGamesPlayed: number;
  totalCorrect: number;
  totalAnswered: number;
  bestStreak: number;
  modeStats: Record<GameMode, { correct: number; total: number }>;
  categoryStats: Partial<Record<CategoryId, { correct: number; total: number }>>;
}

export const GAME_MODES: Record<GameMode, { label: string; description: string; icon: string }> = {
  easy: { label: 'Easy', description: '50/50 - Pick from 2', icon: 'E' },
  medium: { label: 'Medium', description: 'Pick from 4', icon: 'M' },
  hard: { label: 'Hard', description: 'Type the answer', icon: 'H' },
  headsup: { label: 'Heads Up!', description: 'Party mode - tilt to play', icon: '!' },
};

export const CATEGORIES: CategoryInfo[] = [
  // Region-based
  { id: 'africa', label: 'Africa', description: '54 countries', type: 'region', icon: 'AF' },
  { id: 'asia', label: 'Asia', description: '49 countries', type: 'region', icon: 'AS' },
  { id: 'europe', label: 'Europe', description: '45 countries', type: 'region', icon: 'EU' },
  { id: 'americas', label: 'Americas', description: '35 countries', type: 'region', icon: 'AM' },
  { id: 'oceania', label: 'Oceania', description: '14 countries', type: 'region', icon: 'OC' },

  // Theme-based
  { id: 'easy_flags', label: 'Famous Flags', description: 'The ones everyone knows', type: 'theme', icon: '*' },
  { id: 'tricky_twins', label: 'Tricky Twins', description: 'Look-alike flags', type: 'theme', icon: '~' },
  { id: 'island_nations', label: 'Island Nations', description: 'Surrounded by water', type: 'theme', icon: 'IS' },
  { id: 'top_travel', label: 'Top Destinations', description: 'Most visited countries', type: 'theme', icon: 'TD' },
  { id: 'short_names', label: 'Short Names', description: '5 letters or less', type: 'theme', icon: 'SN' },
];

export const CATEGORY_TYPE_LABELS: Record<CategoryType, string> = {
  region: 'By Region',
  theme: 'By Theme',
};
