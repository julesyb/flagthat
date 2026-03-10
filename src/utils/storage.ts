import AsyncStorage from '@react-native-async-storage/async-storage';
import { UserStats, GameMode, CategoryId } from '../types';

const STATS_KEY = '@flagsareus_stats';

const DEFAULT_STATS: UserStats = {
  totalGamesPlayed: 0,
  totalCorrect: 0,
  totalAnswered: 0,
  bestStreak: 0,
  modeStats: {
    easy: { correct: 0, total: 0 },
    medium: { correct: 0, total: 0 },
    hard: { correct: 0, total: 0 },
    flagflash: { correct: 0, total: 0 },
  },
  categoryStats: {},
};

export async function getStats(): Promise<UserStats> {
  try {
    const json = await AsyncStorage.getItem(STATS_KEY);
    if (json) {
      const parsed = JSON.parse(json);
      return {
        ...DEFAULT_STATS,
        ...parsed,
        modeStats: { ...DEFAULT_STATS.modeStats, ...(parsed.modeStats || {}) },
        categoryStats: { ...parsed.categoryStats },
      };
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
  mode: GameMode,
  category: CategoryId,
): Promise<void> {
  try {
    const stats = await getStats();
    stats.totalGamesPlayed += 1;
    stats.totalCorrect += correct;
    stats.totalAnswered += total;
    stats.bestStreak = Math.max(stats.bestStreak, streak);

    stats.modeStats[mode].correct += correct;
    stats.modeStats[mode].total += total;

    if (!stats.categoryStats[category]) {
      stats.categoryStats[category] = { correct: 0, total: 0 };
    }
    stats.categoryStats[category]!.correct += correct;
    stats.categoryStats[category]!.total += total;

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
