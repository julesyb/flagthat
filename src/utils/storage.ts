import AsyncStorage from '@react-native-async-storage/async-storage';
import { UserStats, Difficulty, FlagCategory } from '../types';

const STATS_KEY = '@flagsareus_stats';

const DEFAULT_STATS: UserStats = {
  totalGamesPlayed: 0,
  totalCorrect: 0,
  totalAnswered: 0,
  bestStreak: 0,
  categoryStats: {
    countries: { correct: 0, total: 0 },
    us_states: { correct: 0, total: 0 },
    canadian_provinces: { correct: 0, total: 0 },
    australian_states: { correct: 0, total: 0 },
    brazilian_states: { correct: 0, total: 0 },
    german_states: { correct: 0, total: 0 },
    indian_states: { correct: 0, total: 0 },
    japanese_prefectures: { correct: 0, total: 0 },
    mexican_states: { correct: 0, total: 0 },
    spanish_communities: { correct: 0, total: 0 },
  },
  difficultyStats: {
    easy: { correct: 0, total: 0 },
    hard: { correct: 0, total: 0 },
    extreme: { correct: 0, total: 0 },
  },
};

export async function getStats(): Promise<UserStats> {
  try {
    const json = await AsyncStorage.getItem(STATS_KEY);
    if (json) {
      return { ...DEFAULT_STATS, ...JSON.parse(json) };
    }
    return { ...DEFAULT_STATS };
  } catch {
    return { ...DEFAULT_STATS };
  }
}

export async function updateStats(
  correct: number,
  total: number,
  streak: number,
  difficulty: Difficulty,
  categories: FlagCategory[],
): Promise<void> {
  try {
    const stats = await getStats();
    stats.totalGamesPlayed += 1;
    stats.totalCorrect += correct;
    stats.totalAnswered += total;
    stats.bestStreak = Math.max(stats.bestStreak, streak);

    stats.difficultyStats[difficulty].correct += correct;
    stats.difficultyStats[difficulty].total += total;

    for (const cat of categories) {
      if (stats.categoryStats[cat]) {
        stats.categoryStats[cat].correct += correct;
        stats.categoryStats[cat].total += total;
      }
    }

    await AsyncStorage.setItem(STATS_KEY, JSON.stringify(stats));
  } catch {
    // Silently fail on storage errors
  }
}

export async function resetStats(): Promise<void> {
  try {
    await AsyncStorage.removeItem(STATS_KEY);
  } catch {
    // Silently fail
  }
}
