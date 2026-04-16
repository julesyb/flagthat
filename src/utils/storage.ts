import AsyncStorage from '@react-native-async-storage/async-storage';
import { UserStats, GameMode, CategoryId, GameResult, BaselineRegionId, BASELINE_REGIONS } from '../types';
import { MS_PER_DAY, MASTERED_STREAK, UNLOCK_THRESHOLD, MAX_GAME_HISTORY, MAX_CHALLENGE_HISTORY, DAILY_LEADERBOARD_MAX_AGE_DAYS } from './config';

// Re-export for existing consumers
export { MASTERED_STREAK, UNLOCK_THRESHOLD };

const STATS_KEY = '@flagsareus_stats';
const FLAG_STATS_KEY = '@flagsareus_flag_stats';
const DAY_STREAK_KEY = '@flagsareus_day_streak';
const DAILY_CHALLENGE_KEY = '@flagsareus_daily_challenge';
const DAILY_LOG_KEY = '@flagsareus_daily_log';
const SETTINGS_KEY = '@flagsareus_settings';
const BADGE_DATA_KEY = '@flagsareus_badge_data';
const GAME_HISTORY_KEY = '@flagsareus_game_history';
const BASELINE_KEY = '@flagsareus_baseline';
const CHALLENGE_NAME_KEY = '@flagsareus_challenge_name';
const CHALLENGE_HISTORY_KEY = '@flagsareus_challenge_history';
const REGION_SCORES_KEY = '@flagsareus_region_scores';
const LEVEL_KEY = '@flagsareus_level';
const DAILY_LEADERBOARD_KEY = '@flagsareus_daily_leaderboard';
const SKILL_LEVEL_KEY = '@flagsareus_skill_level';
const PERFECT_STREAK_KEY = '@flagsareus_perfect_streak';
const FLAG_LAST_SHOWN_KEY = '@flagsareus_flag_last_shown';

// ─── Challenge Name ─────────────────────────────────────────
export async function getChallengeName(): Promise<string> {
  try {
    const val = await AsyncStorage.getItem(CHALLENGE_NAME_KEY);
    return val || '';
  } catch { return ''; }
}

export async function saveChallengeName(name: string): Promise<void> {
  try {
    await AsyncStorage.setItem(CHALLENGE_NAME_KEY, name);
  } catch { /* ignore */ }
}

// ─── Badge Tracking Data ───────────────────────────────────
export interface BadgeData {
  dailyChallengesCompleted: number;
  hasShared: boolean;
  earnedBadgeIds: string[];
}

const DEFAULT_BADGE_DATA: BadgeData = {
  dailyChallengesCompleted: 0,
  hasShared: false,
  earnedBadgeIds: [],
};

// Migrate legacy per-badge sticky flags into earnedBadgeIds
const LEGACY_FLAG_MAP: Record<string, string> = {
  lastGamePerfect10: 'perfect_10',
  lastGameSRank: 's_rank',
  earnedPracticePerfect: 'practice_perfect',
  earnedQuickDraw: 'quick_draw',
  earnedRegionAce: 'region_ace',
};

function migrateBadgeData(raw: Record<string, unknown>): { data: BadgeData; needsSave: boolean } {
  const data: BadgeData = {
    dailyChallengesCompleted: (raw.dailyChallengesCompleted as number) || 0,
    hasShared: (raw.hasShared as boolean) || false,
    earnedBadgeIds: (raw.earnedBadgeIds as string[]) || [],
  };
  const ids = new Set(data.earnedBadgeIds);
  let needsSave = false;
  for (const [flag, badgeId] of Object.entries(LEGACY_FLAG_MAP)) {
    if (raw[flag] && !ids.has(badgeId)) {
      ids.add(badgeId);
      needsSave = true;
    }
  }
  if (needsSave) data.earnedBadgeIds = [...ids];
  return { data, needsSave };
}

export async function getBadgeData(): Promise<BadgeData> {
  try {
    const json = await AsyncStorage.getItem(BADGE_DATA_KEY);
    if (json) {
      const { data, needsSave } = migrateBadgeData(JSON.parse(json));
      if (needsSave) await AsyncStorage.setItem(BADGE_DATA_KEY, JSON.stringify(data));
      return data;
    }
    return { ...DEFAULT_BADGE_DATA };
  } catch {
    return { ...DEFAULT_BADGE_DATA };
  }
}

export async function saveBadgeData(data: BadgeData): Promise<void> {
  try {
    await AsyncStorage.setItem(BADGE_DATA_KEY, JSON.stringify(data));
  } catch {
    // Silently fail
  }
}

export async function markShared(): Promise<void> {
  try {
    const data = await getBadgeData();
    data.hasShared = true;
    await saveBadgeData(data);
  } catch { /* ignore */ }
}

export async function incrementDailyChallenges(): Promise<void> {
  try {
    const data = await getBadgeData();
    data.dailyChallengesCompleted += 1;
    await saveBadgeData(data);
  } catch { /* ignore */ }
}

export async function persistEarnedBadges(badgeIds: string[]): Promise<void> {
  const data = await getBadgeData();
  const ids = new Set(data.earnedBadgeIds);
  let changed = false;
  for (const id of badgeIds) {
    if (!ids.has(id)) { ids.add(id); changed = true; }
  }
  if (changed) {
    data.earnedBadgeIds = [...ids];
    await saveBadgeData(data);
  }
}

// ─── App Settings ──────────────────────────────────────────
export type ThemeMode = 'light' | 'dark' | 'system';

export interface AppSettings {
  soundEnabled: boolean;
  hapticsEnabled: boolean;
  dailyReminderEnabled: boolean;
  reminderHour: number; // 0-23
  reminderMinute: number; // 0-59
  locale: string | null; // null = auto-detect from device
  themeMode: ThemeMode;
}

const DEFAULT_SETTINGS: AppSettings = {
  soundEnabled: true,
  hapticsEnabled: true,
  dailyReminderEnabled: false,
  reminderHour: 9,
  reminderMinute: 0,
  locale: null,
  themeMode: 'dark',
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
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

const DEFAULT_STATS: UserStats = {
  totalGamesPlayed: 0,
  totalCorrect: 0,
  totalAnswered: 0,
  bestStreak: 0,
  bestTimeAttackScore: 0,
  totalCorrectTimeMs: 0,
  totalCorrectCount: 0,
  modeStats: {
    easy: { correct: 0, total: 0 },
    medium: { correct: 0, total: 0 },
    hard: { correct: 0, total: 0 },
    flashflag: { correct: 0, total: 0 },
    flagpuzzle: { correct: 0, total: 0 },
    timeattack: { correct: 0, total: 0 },
    neighbors: { correct: 0, total: 0 },
    impostor: { correct: 0, total: 0 },
    capitalconnection: { correct: 0, total: 0 },
    daily: { correct: 0, total: 0 },
    practice: { correct: 0, total: 0 },
    baseline: { correct: 0, total: 0 },
  },
  categoryStats: {},
};

export async function getStats(): Promise<UserStats> {
  try {
    const json = await AsyncStorage.getItem(STATS_KEY);
    if (json) {
      const parsed = JSON.parse(json);
      const mergedModeStats = { ...DEFAULT_STATS.modeStats, ...(parsed.modeStats || {}) };

      // Migrate renamed mode: flagflash -> flashflag (v1.1)
      const old = (parsed.modeStats || {}) as Record<string, { correct: number; total: number }>;
      if (old.flagflash && old.flagflash.total > 0) {
        mergedModeStats.flashflag = {
          correct: (mergedModeStats.flashflag?.correct || 0) + old.flagflash.correct,
          total: (mergedModeStats.flashflag?.total || 0) + old.flagflash.total,
        };
        delete (mergedModeStats as Record<string, unknown>).flagflash;
      }

      return {
        ...DEFAULT_STATS,
        ...parsed,
        modeStats: mergedModeStats,
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
  speedData?: { correctTimeMs: number; correctCount: number },
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

    // Speed tracking
    if (speedData && speedData.correctCount > 0) {
      stats.totalCorrectTimeMs = (stats.totalCorrectTimeMs || 0) + speedData.correctTimeMs;
      stats.totalCorrectCount = (stats.totalCorrectCount || 0) + speedData.correctCount;
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
    await AsyncStorage.removeItem(DAILY_LOG_KEY);
    await AsyncStorage.removeItem(GAME_HISTORY_KEY);
    await AsyncStorage.removeItem(BASELINE_KEY);
    await AsyncStorage.removeItem(CHALLENGE_HISTORY_KEY);
    await AsyncStorage.removeItem(REGION_SCORES_KEY);
    await AsyncStorage.removeItem(LEVEL_KEY);
    await AsyncStorage.removeItem(DAILY_LEADERBOARD_KEY);
    await AsyncStorage.removeItem(CHALLENGE_NAME_KEY);
    await AsyncStorage.removeItem(SKILL_LEVEL_KEY);
    await AsyncStorage.removeItem(PERFECT_STREAK_KEY);
    await AsyncStorage.removeItem(FLAG_LAST_SHOWN_KEY);
    cachedLastShown = {};
    cachedFlagStats = {};
  } catch {
    // Silently fail
  }
}

export interface DayStreakInfo {
  current: number;
  best: number;
}

export async function getDayStreak(): Promise<number> {
  return (await getDayStreakInfo()).current;
}

export async function getDayStreakInfo(): Promise<DayStreakInfo> {
  try {
    const json = await AsyncStorage.getItem(DAY_STREAK_KEY);
    if (!json) return { current: 0, best: 0 };
    const { lastDate, streak, best } = JSON.parse(json);
    const bestStreak = best || streak || 0;
    const today = getTodayDate();
    if (lastDate === today) return { current: streak, best: bestStreak };
    const diffDays = Math.round(
      (new Date(today + 'T00:00:00').getTime() - new Date(lastDate + 'T00:00:00').getTime()) / MS_PER_DAY,
    );
    return { current: diffDays === 1 ? streak : 0, best: bestStreak };
  } catch {
    return { current: 0, best: 0 };
  }
}

async function recordDayPlayed(): Promise<number> {
  try {
    const today = getTodayDate();
    const json = await AsyncStorage.getItem(DAY_STREAK_KEY);
    let streak = 1;
    let best = 0;
    if (json) {
      const data = JSON.parse(json);
      best = data.best || data.streak || 0;
      if (data.lastDate === today) return data.streak;
      const diffDays = Math.round(
        (new Date(today + 'T00:00:00').getTime() - new Date(data.lastDate + 'T00:00:00').getTime()) / MS_PER_DAY,
      );
      if (diffDays === 1) streak = data.streak + 1;
    }
    best = Math.max(best, streak);
    await AsyncStorage.setItem(DAY_STREAK_KEY, JSON.stringify({ lastDate: today, streak, best }));
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

export async function isDailyCompleteToday(): Promise<boolean> {
  try {
    const json = await AsyncStorage.getItem(DAILY_CHALLENGE_KEY);
    if (!json) return false;
    const data: DailyChallengeData = JSON.parse(json);
    return data.completed && data.date === getTodayDate();
  } catch {
    return false;
  }
}

export async function getDailyChallengeData(): Promise<DailyChallengeData | null> {
  try {
    const json = await AsyncStorage.getItem(DAILY_CHALLENGE_KEY);
    if (!json) return null;
    return JSON.parse(json);
  } catch {
    return null;
  }
}

export async function saveDailyChallenge(results: GameResult[]): Promise<void> {
  try {
    const score = results.filter((r) => r.correct).length;
    const today = getTodayDate();
    const data: DailyChallengeData = {
      date: today,
      completed: true,
      results,
      score,
    };
    await AsyncStorage.setItem(DAILY_CHALLENGE_KEY, JSON.stringify(data));
    await appendDailyLog(today, score, results);
  } catch {
    // Silently fail
  }
}

// ─── Daily Challenge Log ──────────────────────────────────
// Lightweight per-day record. Questions are regenerable from the date
// via generateDailyQuestions(date), so we only store outcomes.
export interface DailyLogAnswer {
  flagId: string;
  correct: boolean;
  userAnswer: string;
}

export interface DailyLogEntry {
  score: number;
  total: number;
  answers: DailyLogAnswer[];
}

export type DailyLog = Record<string, DailyLogEntry>;

async function getDailyLog(): Promise<DailyLog> {
  try {
    const json = await AsyncStorage.getItem(DAILY_LOG_KEY);
    if (json) return JSON.parse(json);
    return {};
  } catch {
    return {};
  }
}

async function appendDailyLog(date: string, score: number, results: GameResult[]): Promise<void> {
  try {
    const log = await getDailyLog();
    log[date] = {
      score,
      total: results.length,
      answers: results.map((r) => ({
        flagId: r.question.flag.id,
        correct: r.correct,
        userAnswer: r.userAnswer,
      })),
    };
    await AsyncStorage.setItem(DAILY_LOG_KEY, JSON.stringify(log));
  } catch {
    // Silently fail
  }
}

// Per-flag stats: tracks wrong/right counts and consecutive-right streak.
// Once rightStreak reaches MASTERED_STREAK, the flag is considered "learned"
// and drops out of Practice More. Getting it wrong again resets the streak.
export interface FlagStats {
  [flagId: string]: { wrong: number; right: number; rightStreak: number; totalTimeRight?: number; totalTimeWrong?: number };
}

let cachedFlagStats: FlagStats | null = null;

export async function getFlagStats(): Promise<FlagStats> {
  if (cachedFlagStats) return cachedFlagStats;
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
      cachedFlagStats = parsed;
      return parsed;
    }
    cachedFlagStats = {};
    return {};
  } catch {
    cachedFlagStats = {};
    return {};
  }
}

/**
 * Synchronous accessor for the cached flag stats. Returns an empty object
 * if the cache hasn't been primed yet (caller should treat unknown flags
 * as "neutral"). Primed at app startup via primeFlagStatsCache.
 */
export function getFlagStatsSync(): FlagStats {
  return cachedFlagStats ?? {};
}

export async function primeFlagStatsCache(): Promise<void> {
  await getFlagStats();
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
        stats[id].totalTimeRight = (stats[id].totalTimeRight || 0) + r.timeTaken;
      } else {
        stats[id].wrong += 1;
        stats[id].rightStreak = 0;
        stats[id].totalTimeWrong = (stats[id].totalTimeWrong || 0) + r.timeTaken;
      }
    }
    cachedFlagStats = stats;
    await AsyncStorage.setItem(FLAG_STATS_KEY, JSON.stringify(stats));
  } catch {
    // Silently fail
  }
}

// ─── Flag Rotation (last-shown tracking) ───────────────────
// Tracks when each flag was last presented to the user as a question.
// Game screens use this to sort the flag pool so that the least-recently-shown
// flags surface first, cycling through the whole pool before repeats.
//
// Reads are served from an in-memory cache primed at app startup so that
// synchronous selection code (useMemo in game screens) can consult it without
// needing to await AsyncStorage on every render.

export type FlagLastShown = Record<string, number>;

let cachedLastShown: FlagLastShown | null = null;

export async function primeFlagLastShownCache(): Promise<void> {
  try {
    const json = await AsyncStorage.getItem(FLAG_LAST_SHOWN_KEY);
    cachedLastShown = json ? JSON.parse(json) : {};
  } catch {
    cachedLastShown = {};
  }
}

export function getFlagLastShownSync(): FlagLastShown {
  return cachedLastShown ?? {};
}

export async function recordFlagsShown(flagIds: string[]): Promise<void> {
  if (flagIds.length === 0) return;
  try {
    if (!cachedLastShown) await primeFlagLastShownCache();
    const current = cachedLastShown!;
    const now = Date.now();
    for (const id of flagIds) current[id] = now;
    await AsyncStorage.setItem(FLAG_LAST_SHOWN_KEY, JSON.stringify(current));
  } catch {
    // Silently fail
  }
}

export async function getMissedFlagIds(): Promise<string[]> {
  const stats = await getFlagStats();
  return Object.entries(stats)
    .filter(([, s]) => s.wrong > 0 && s.rightStreak < MASTERED_STREAK)
    .sort(([, a], [, b]) => b.wrong - a.wrong)
    .map(([id]) => id);
}

// ─── Game History (last 50 games for score distribution) ─────
export interface GameHistoryEntry {
  accuracy: number; // 0-100
  mode: GameMode;
  date: string;
}

export async function getGameHistory(): Promise<GameHistoryEntry[]> {
  try {
    const json = await AsyncStorage.getItem(GAME_HISTORY_KEY);
    if (json) return JSON.parse(json);
    return [];
  } catch {
    return [];
  }
}

export async function addGameHistoryEntry(accuracy: number, mode: GameMode): Promise<void> {
  try {
    const history = await getGameHistory();
    history.push({ accuracy, mode, date: getTodayDate() });
    // Keep only the most recent entries
    const trimmed = history.slice(-MAX_GAME_HISTORY);
    await AsyncStorage.setItem(GAME_HISTORY_KEY, JSON.stringify(trimmed));
  } catch {
    // Silently fail
  }
}

// ─── Baseline Data ────────────────────────────────────────
export interface BaselineRegionResult {
  accuracy: number;
  correct: number;
  total: number;
  completedAt: string;
}

export interface BaselineData {
  regions: Partial<Record<BaselineRegionId, BaselineRegionResult>>;
  startedAt: string;
  completedAt: string | null;
  skipped?: boolean;
}

// Use the canonical BASELINE_REGIONS from types

export async function getBaselineData(): Promise<BaselineData | null> {
  try {
    const json = await AsyncStorage.getItem(BASELINE_KEY);
    if (json) return JSON.parse(json);
    return null;
  } catch {
    return null;
  }
}

export async function saveBaselineResult(
  region: BaselineRegionId,
  results: GameResult[],
  regionTotal?: number,
): Promise<BaselineData> {
  const existing = await getBaselineData();
  const correct = results.filter((r) => r.correct).length;
  const total = regionTotal ?? results.length;
  const accuracy = total > 0 ? Math.round((correct / total) * 100) : 0;

  const data: BaselineData = existing ?? {
    regions: {},
    startedAt: new Date().toISOString(),
    completedAt: null,
  };

  data.regions[region] = {
    accuracy,
    correct,
    total,
    completedAt: new Date().toISOString(),
  };

  // Check if all 5 regions are done
  const allDone = BASELINE_REGIONS.every((r) => data.regions[r]);
  if (allDone && !data.completedAt) {
    data.completedAt = new Date().toISOString();
  }

  await AsyncStorage.setItem(BASELINE_KEY, JSON.stringify(data));
  return data;
}

export async function hasCompletedOnboarding(): Promise<boolean> {
  const data = await getBaselineData();
  if (!data) return false;
  return data.completedAt !== null || data.skipped === true;
}

export async function skipOnboarding(): Promise<void> {
  const existing = await getBaselineData();
  const data: BaselineData = existing ?? {
    regions: {},
    startedAt: new Date().toISOString(),
    completedAt: null,
  };
  data.skipped = true;
  await AsyncStorage.setItem(BASELINE_KEY, JSON.stringify(data));
}

// ─── Challenge History ────────────────────────────────────
export interface ChallengeOpponent {
  name: string;
  score: number;
  results?: boolean[];
  date: string;             // ISO date when this opponent responded
}

export interface ChallengeHistoryEntry {
  shortCode: string;        // 6-char alphanumeric identifier
  mode: GameMode;
  date: string;             // ISO date string
  myName: string;
  myScore: number;
  totalFlags: number;
  opponentName: string | null;
  opponentScore: number | null;
  direction: 'sent' | 'received';
  fullCode: string;         // Full FT2: code for resharing
  myResults?: boolean[];    // Per-question correct/wrong for me
  opponentResults?: boolean[]; // Per-question correct/wrong for opponent
  opponents?: ChallengeOpponent[]; // All opponents who responded (multiplayer)
}

export async function getChallengeHistory(): Promise<ChallengeHistoryEntry[]> {
  try {
    const json = await AsyncStorage.getItem(CHALLENGE_HISTORY_KEY);
    if (json) return JSON.parse(json);
    return [];
  } catch {
    return [];
  }
}

export async function addChallengeToHistory(entry: ChallengeHistoryEntry): Promise<void> {
  try {
    const history = await getChallengeHistory();
    // Check if this challenge already exists (by shortCode + direction)
    const existingIdx = history.findIndex(
      (h) => h.shortCode === entry.shortCode && h.direction === entry.direction,
    );
    if (existingIdx >= 0) {
      // Preserve accumulated opponents when re-saving a sent challenge
      const existing = history[existingIdx];
      if (existing.opponents && existing.opponents.length > 0 && !entry.opponents) {
        const lastOpp = existing.opponents[existing.opponents.length - 1];
        history[existingIdx] = {
          ...entry,
          opponents: existing.opponents,
          opponentName: lastOpp.name,
          opponentScore: lastOpp.score,
          opponentResults: lastOpp.results,
        };
      } else {
        history[existingIdx] = entry;
      }
    } else {
      history.unshift(entry); // newest first
    }
    const trimmed = history.slice(0, MAX_CHALLENGE_HISTORY);
    await AsyncStorage.setItem(CHALLENGE_HISTORY_KEY, JSON.stringify(trimmed));
  } catch {
    // Silently fail
  }
}

export async function updateSentChallengeWithOpponent(
  shortCode: string,
  opponentName: string,
  opponentScore: number,
  opponentResults?: boolean[],
): Promise<boolean> {
  try {
    const history = await getChallengeHistory();
    const idx = history.findIndex(
      (h) => h.shortCode === shortCode && h.direction === 'sent',
    );
    if (idx < 0) return false;

    // Initialize opponents array from legacy single-opponent fields if needed
    if (!history[idx].opponents) {
      history[idx].opponents = [];
      if (history[idx].opponentName !== null && history[idx].opponentScore !== null) {
        history[idx].opponents.push({
          name: history[idx].opponentName!,
          score: history[idx].opponentScore!,
          results: history[idx].opponentResults,
          date: history[idx].date,
        });
      }
    }

    // Check if this opponent already responded (by name) - update their score
    const existingOpp = history[idx].opponents!.findIndex(
      (o) => o.name.toLowerCase() === opponentName.toLowerCase(),
    );
    const oppEntry: ChallengeOpponent = {
      name: opponentName,
      score: opponentScore,
      results: opponentResults,
      date: new Date().toISOString(),
    };
    if (existingOpp >= 0) {
      history[idx].opponents![existingOpp] = oppEntry;
    } else {
      history[idx].opponents!.push(oppEntry);
    }

    // Keep legacy fields in sync with the most recent opponent for backward compat
    history[idx].opponentName = opponentName;
    history[idx].opponentScore = opponentScore;
    history[idx].opponentResults = opponentResults;

    await AsyncStorage.setItem(CHALLENGE_HISTORY_KEY, JSON.stringify(history));
    return true;
  } catch {
    return false;
  }
}

// ─── Region Score History ─────────────────────────────────
export interface RegionScoreEntry {
  correct: number;
  total: number;
  date: string;
}

export interface RegionScores {
  first: RegionScoreEntry;
  best: RegionScoreEntry;
  mostRecent: RegionScoreEntry;
}

export type RegionScoreHistory = Partial<Record<BaselineRegionId, RegionScores>>;

export async function getRegionScoreHistory(): Promise<RegionScoreHistory> {
  try {
    const json = await AsyncStorage.getItem(REGION_SCORES_KEY);
    if (json) return JSON.parse(json);
    return {};
  } catch {
    return {};
  }
}

export async function recordRegionScore(
  region: BaselineRegionId,
  correct: number,
  total: number,
): Promise<void> {
  try {
    const history = await getRegionScoreHistory();
    const date = getTodayDate();
    const entry: RegionScoreEntry = { correct, total, date };
    const pct = total > 0 ? correct / total : 0;

    const existing = history[region];
    if (!existing) {
      history[region] = { first: entry, best: entry, mostRecent: entry };
    } else {
      const bestPct = existing.best.total > 0 ? existing.best.correct / existing.best.total : 0;
      if (pct > bestPct || (pct === bestPct && correct > existing.best.correct)) {
        existing.best = entry;
      }
      existing.mostRecent = entry;
    }

    await AsyncStorage.setItem(REGION_SCORES_KEY, JSON.stringify(history));
  } catch {
    // Silently fail
  }
}

// ─── Level Progress (one-way door) ────────────────────────────
// Persists the highest completed level. Levels never regress.
export async function getPersistedLevel(): Promise<number> {
  try {
    const val = await AsyncStorage.getItem(LEVEL_KEY);
    return val ? parseInt(val, 10) || 0 : 0;
  } catch {
    return 0;
  }
}

export async function persistLevel(level: number): Promise<void> {
  try {
    const current = await getPersistedLevel();
    if (level > current) {
      await AsyncStorage.setItem(LEVEL_KEY, String(level));
    }
  } catch {
    // Silently fail
  }
}

// ─── Skill Level ─────────────────────────────────────────
// User's self-assessed skill level from onboarding, with auto-progression.
// Starts at whatever the user picks, then progresses when they consistently ace games.

export type SkillLevel = 'beginner' | 'intermediate' | 'advanced' | 'expert';

export const SKILL_LEVELS: readonly SkillLevel[] = ['beginner', 'intermediate', 'advanced', 'expert'];

export const SKILL_TAG_KEYS: Record<SkillLevel, string> = {
  beginner: 'onboarding.skillBeginnerTag',
  intermediate: 'onboarding.skillIntermediateTag',
  advanced: 'onboarding.skillAdvancedTag',
  expert: 'onboarding.skillExpertTag',
};

/** Number of consecutive 100% games needed to auto-promote difficulty */
const PERFECT_GAMES_TO_PROMOTE = 10;

const SKILL_TO_DIFFICULTY: Record<SkillLevel, 'easy' | 'medium' | 'hard'> = {
  beginner: 'easy',
  intermediate: 'medium',
  advanced: 'hard',
  expert: 'hard',
};

const SKILL_PROGRESSION: Record<SkillLevel, SkillLevel | null> = {
  beginner: 'intermediate',
  intermediate: 'advanced',
  advanced: 'expert',
  expert: null,
};

export async function getSkillLevel(): Promise<SkillLevel | null> {
  try {
    const val = await AsyncStorage.getItem(SKILL_LEVEL_KEY);
    if (val && ['beginner', 'intermediate', 'advanced', 'expert'].includes(val)) {
      return val as SkillLevel;
    }
    return null;
  } catch {
    return null;
  }
}

export async function saveSkillLevel(level: SkillLevel): Promise<void> {
  try {
    await AsyncStorage.setItem(SKILL_LEVEL_KEY, level);
  } catch { /* ignore */ }
}

export function getDefaultDifficulty(skill: SkillLevel): 'easy' | 'medium' | 'hard' {
  return SKILL_TO_DIFFICULTY[skill];
}

/** Returns the current consecutive-perfect-game count for the active skill level */
async function getPerfectStreak(): Promise<{ level: SkillLevel; count: number }> {
  try {
    const json = await AsyncStorage.getItem(PERFECT_STREAK_KEY);
    if (json) return JSON.parse(json);
    return { level: 'beginner', count: 0 };
  } catch {
    return { level: 'beginner', count: 0 };
  }
}

/** Core quiz modes that count toward skill progression */
const PROGRESSION_MODES = new Set(['easy', 'medium', 'hard', 'daily', 'timeattack']);

/**
 * Called after each quiz game. If the user got 100%, increment their perfect streak.
 * After PERFECT_GAMES_TO_PROMOTE consecutive perfect games, auto-promote their skill level.
 * Only core quiz modes count — special modes (flash flag, impostor, etc.) are ignored.
 * Returns the new skill level if promoted, null otherwise.
 */
export async function recordGameForProgression(
  correct: number,
  total: number,
  mode: string,
): Promise<SkillLevel | null> {
  try {
    if (!PROGRESSION_MODES.has(mode)) return null;

    const skill = await getSkillLevel();
    if (!skill) return null;

    const nextSkill = SKILL_PROGRESSION[skill];
    if (!nextSkill) return null; // already at max

    const isPerfect = total > 0 && correct === total;
    const streak = await getPerfectStreak();

    // Reset streak if skill level changed externally
    if (streak.level !== skill) {
      streak.level = skill;
      streak.count = 0;
    }

    if (isPerfect) {
      streak.count += 1;
    } else {
      streak.count = 0;
    }

    await AsyncStorage.setItem(PERFECT_STREAK_KEY, JSON.stringify(streak));

    if (streak.count >= PERFECT_GAMES_TO_PROMOTE) {
      await saveSkillLevel(nextSkill);
      // Reset streak for new level
      await AsyncStorage.setItem(PERFECT_STREAK_KEY, JSON.stringify({ level: nextSkill, count: 0 }));
      return nextSkill;
    }

    return null;
  } catch {
    return null;
  }
}

// ─── Daily Leaderboard ────────────────────────────────────
// Per-date leaderboard tracking friends who shared their daily challenge results.
// Each entry has: name, score (correct count), totalTimeMs (total completion time).
// Sorted by most correct first, then fastest time as tiebreaker.

export interface DailyLeaderboardEntry {
  name: string;
  score: number;
  totalTimeMs: number;
  isMe: boolean;
}

export type DailyLeaderboard = Record<string, DailyLeaderboardEntry[]>;

export async function getDailyLeaderboard(): Promise<DailyLeaderboard> {
  try {
    const json = await AsyncStorage.getItem(DAILY_LEADERBOARD_KEY);
    if (json) return JSON.parse(json);
    return {};
  } catch {
    return {};
  }
}

export async function getDailyLeaderboardForDate(date: string): Promise<DailyLeaderboardEntry[]> {
  const lb = await getDailyLeaderboard();
  return sortLeaderboard(lb[date] || []);
}

export function sortLeaderboard(entries: DailyLeaderboardEntry[]): DailyLeaderboardEntry[] {
  return [...entries].sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.totalTimeMs - b.totalTimeMs;
  });
}

export async function addDailyLeaderboardEntry(
  date: string,
  entry: DailyLeaderboardEntry,
): Promise<DailyLeaderboardEntry[]> {
  try {
    const lb = await getDailyLeaderboard();
    if (!lb[date]) lb[date] = [];

    // For "me" entries, replace any existing isMe entry (user may have changed name).
    // For friend entries, upsert by name (case-insensitive), but never overwrite isMe entry.
    const existingIdx = entry.isMe
      ? lb[date].findIndex((e) => e.isMe)
      : lb[date].findIndex((e) => !e.isMe && e.name.toLowerCase() === entry.name.toLowerCase());
    if (existingIdx >= 0) {
      lb[date][existingIdx] = entry;
    } else {
      lb[date].push(entry);
    }

    // Prune old dates
    const dates = Object.keys(lb).sort();
    while (dates.length > DAILY_LEADERBOARD_MAX_AGE_DAYS) {
      const oldest = dates.shift()!;
      delete lb[oldest];
    }

    await AsyncStorage.setItem(DAILY_LEADERBOARD_KEY, JSON.stringify(lb));
    return sortLeaderboard(lb[date]);
  } catch {
    return sortLeaderboard([entry]);
  }
}
