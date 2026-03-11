import AsyncStorage from '@react-native-async-storage/async-storage';
import { UserStats, GameMode, CategoryId, GameResult } from '../types';

const STATS_KEY = '@flagsareus_stats';
const FLAG_STATS_KEY = '@flagsareus_flag_stats';
const DAY_STREAK_KEY = '@flagsareus_day_streak';
const DAILY_CHALLENGE_KEY = '@flagsareus_daily_challenge';
const SETTINGS_KEY = '@flagsareus_settings';
const BADGE_DATA_KEY = '@flagsareus_badge_data';

// ─── Badge Tracking Data ───────────────────────────────────
export interface BadgeData {
  dailyChallengesCompleted: number;
  hasShared: boolean;
  lastGamePerfect10: boolean;
  lastGameSRank: boolean;
}

const DEFAULT_BADGE_DATA: BadgeData = {
  dailyChallengesCompleted: 0,
  hasShared: false,
  lastGamePerfect10: false,
  lastGameSRank: false,
};

export async function getBadgeData(): Promise<BadgeData> {
  try {
    const json = await AsyncStorage.getItem(BADGE_DATA_KEY);
    if (json) return { ...DEFAULT_BADGE_DATA, ...JSON.parse(json) };
    return { ...DEFAULT_BADGE_DATA };
  } catch {
    return { ...DEFAULT_BADGE_DATA };
  }
}

export async function saveBadgeData(data: Partial<BadgeData>): Promise<void> {
  try {
    const current = await getBadgeData();
    const updated = { ...current, ...data };
    await AsyncStorage.setItem(BADGE_DATA_KEY, JSON.stringify(updated));
  } catch {
    // Silently fail
  }
}

export async function markShared(): Promise<void> {
  await saveBadgeData({ hasShared: true });
}

export async function incrementDailyChallenges(): Promise<void> {
  const data = await getBadgeData();
  await saveBadgeData({ dailyChallengesCompleted: data.dailyChallengesCompleted + 1 });
}

export async function updateLastGameBadgeFlags(correct: number, total: number): Promise<void> {
  const data = await getBadgeData();
  const accuracy = total > 0 ? Math.round((correct / total) * 100) : 0;
  await saveBadgeData({
    lastGamePerfect10: data.lastGamePerfect10 || (correct === total && total >= 10),
    lastGameSRank: data.lastGameSRank || (accuracy >= 95 && total >= 5),
  });
}

// ─── App Settings ──────────────────────────────────────────
export interface AppSettings {
  soundEnabled: boolean;
  hapticsEnabled: boolean;
  dailyReminderEnabled: boolean;
  reminderHour: number; // 0-23
  reminderMinute: number; // 0-59
  locale: string | null; // null = auto-detect from device
}

const DEFAULT_SETTINGS: AppSettings = {
  soundEnabled: true,
  hapticsEnabled: true,
  dailyReminderEnabled: false,
  reminderHour: 9,
  reminderMinute: 0,
  locale: null,
};

export async function getSettings(): Promise<AppSettings> {
  try {
    const json = await AsyncStorage.getItem(SETTINGS_KEY);
    if (json) return { ...DEFAULT_SETTINGS, ...JSON.parse(json) };
    return { ...DEFAULT_SETTINGS };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export async function saveSettings(settings: AppSettings): Promise<void> {
  try {
    await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    // Silently fail
  }
}

function getTodayDate(): string {
  return new Date().toISOString().slice(0, 10);
}

const DEFAULT_STATS: UserStats = {
  totalGamesPlayed: 0,
  totalCorrect: 0,
  totalAnswered: 0,
  bestStreak: 0,
  bestTimeAttackScore: 0,
  modeStats: {
    easy: { correct: 0, total: 0 },
    medium: { correct: 0, total: 0 },
    hard: { correct: 0, total: 0 },
    flagflash: { correct: 0, total: 0 },
    flagpuzzle: { correct: 0, total: 0 },
    timeattack: { correct: 0, total: 0 },
    neighbors: { correct: 0, total: 0 },
    impostor: { correct: 0, total: 0 },
    capitalconnection: { correct: 0, total: 0 },
    daily: { correct: 0, total: 0 },
    practice: { correct: 0, total: 0 },
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
    if (mode === 'timeattack') {
      stats.bestTimeAttackScore = Math.max(stats.bestTimeAttackScore || 0, correct);
    }

    stats.modeStats[mode].correct += correct;
    stats.modeStats[mode].total += total;

    if (!stats.categoryStats[category]) {
      stats.categoryStats[category] = { correct: 0, total: 0 };
    }
    stats.categoryStats[category]!.correct += correct;
    stats.categoryStats[category]!.total += total;

    await AsyncStorage.setItem(STATS_KEY, JSON.stringify(stats));
    await recordDayPlayed();
  } catch {
    // Silently fail on storage errors
  }
}

export async function resetStats(): Promise<void> {
  try {
    await AsyncStorage.removeItem(STATS_KEY);
    await AsyncStorage.removeItem(FLAG_STATS_KEY);
    await AsyncStorage.removeItem(DAY_STREAK_KEY);
    await AsyncStorage.removeItem(BADGE_DATA_KEY);
    await AsyncStorage.removeItem(DAILY_CHALLENGE_KEY);
  } catch {
    // Silently fail
  }
}

export async function getDayStreak(): Promise<number> {
  try {
    const json = await AsyncStorage.getItem(DAY_STREAK_KEY);
    if (!json) return 0;
    const { lastDate, streak } = JSON.parse(json);
    const today = getTodayDate();
    if (lastDate === today) return streak;
    const diffDays = Math.round(
      (new Date(today + 'T00:00:00').getTime() - new Date(lastDate + 'T00:00:00').getTime()) / 86400000,
    );
    return diffDays === 1 ? streak : 0;
  } catch {
    return 0;
  }
}

async function recordDayPlayed(): Promise<number> {
  try {
    const today = getTodayDate();
    const json = await AsyncStorage.getItem(DAY_STREAK_KEY);
    let streak = 1;
    if (json) {
      const data = JSON.parse(json);
      if (data.lastDate === today) return data.streak;
      const diffDays = Math.round(
        (new Date(today + 'T00:00:00').getTime() - new Date(data.lastDate + 'T00:00:00').getTime()) / 86400000,
      );
      if (diffDays === 1) streak = data.streak + 1;
    }
    await AsyncStorage.setItem(DAY_STREAK_KEY, JSON.stringify({ lastDate: today, streak }));
    return streak;
  } catch {
    return 0;
  }
}

// ─── Daily Challenge ───────────────────────────────────────
export interface DailyChallengeData {
  date: string;
  completed: boolean;
  results: GameResult[];
  score: number;
}

export async function getDailyChallenge(): Promise<DailyChallengeData | null> {
  try {
    const json = await AsyncStorage.getItem(DAILY_CHALLENGE_KEY);
    if (!json) return null;
    const data = JSON.parse(json);
    const today = getTodayDate();
    if (data.date !== today) return null;
    return data;
  } catch {
    return null;
  }
}

export async function saveDailyChallenge(results: GameResult[]): Promise<void> {
  try {
    const score = results.filter((r) => r.correct).length;
    const data: DailyChallengeData = {
      date: getTodayDate(),
      completed: true,
      results,
      score,
    };
    await AsyncStorage.setItem(DAILY_CHALLENGE_KEY, JSON.stringify(data));
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
