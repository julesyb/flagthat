import AsyncStorage from '@react-native-async-storage/async-storage';
import { UserStats, GameMode, CategoryId, GameResult } from '../types';

const STATS_KEY = '@flagsareus_stats';
const FLAG_STATS_KEY = '@flagsareus_flag_stats';

const DEFAULT_STATS: UserStats = {
  totalGamesPlayed: 0,
  totalCorrect: 0,
  totalAnswered: 0,
  bestStreak: 0,
  modeStats: {
    easy: { correct: 0, total: 0 },
    medium: { correct: 0, total: 0 },
    hard: { correct: 0, total: 0 },
    headsup: { correct: 0, total: 0 },
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
    await AsyncStorage.removeItem(FLAG_STATS_KEY);
  } catch {
    // Silently fail
  }
}

// Per-flag stats: tracks wrong/right counts and consecutive-right streak.
// Once rightStreak reaches 3, the flag is considered "learned" and drops
// out of Practice More. Getting it wrong again resets the streak.
export interface FlagStats {
  [flagId: string]: { wrong: number; right: number; rightStreak: number };
}

export async function getFlagStats(): Promise<FlagStats> {
  try {
    const json = await AsyncStorage.getItem(FLAG_STATS_KEY);
    if (json) {
      const parsed = JSON.parse(json);
      // Backfill rightStreak for data saved before this field existed
      for (const id of Object.keys(parsed)) {
        if (parsed[id].rightStreak === undefined) {
          parsed[id].rightStreak = 0;
        }
      }
      return parsed;
    }
    return {};
  } catch {
    return {};
  }
}

export async function updateFlagResults(results: GameResult[]): Promise<void> {
  try {
    const stats = await getFlagStats();
    for (const r of results) {
      const id = r.question.flag.id;
      if (!stats[id]) {
        stats[id] = { wrong: 0, right: 0, rightStreak: 0 };
      }
      if (r.correct) {
        stats[id].right += 1;
        stats[id].rightStreak += 1;
      } else {
        stats[id].wrong += 1;
        stats[id].rightStreak = 0;
      }
    }
    await AsyncStorage.setItem(FLAG_STATS_KEY, JSON.stringify(stats));
  } catch {
    // Silently fail
  }
}

export async function getMissedFlagIds(): Promise<string[]> {
  const stats = await getFlagStats();
  return Object.entries(stats)
    .filter(([, s]) => s.wrong > 0 && s.rightStreak < 3)
    .sort(([, a], [, b]) => b.wrong - a.wrong)
    .map(([id]) => id);
}
