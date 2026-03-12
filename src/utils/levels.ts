import { UserStats, GameMode, CategoryId } from '../types';
import { FlagStats, BadgeData, DayStreakInfo } from './storage';
import { UNLOCK_THRESHOLD } from './config';
import { getTotalFlagCount, getCategoryCount } from '../data';
import { t } from './i18n';

// ─── Level requirement types ──────────────────────────────────
// Each level has a single requirement defined by a discriminated union.
// The evaluator computes progress/target from stored data - nothing hardcoded.

export type LevelRequirement =
  | { type: 'flags_correct_once'; count: number }           // Get N unique flags right at least once
  | { type: 'flags_correct_n'; count: number; times: number } // Get N unique flags right at least `times` times
  | { type: 'flags_correct_all'; times: number }             // Get ALL flags right at least `times` times
  | { type: 'flags_fast'; seconds: number; count: number }   // Get N flags right in under `seconds` seconds
  | { type: 'flags_fast_all'; seconds: number }              // Get ALL flags right in under `seconds` seconds
  | { type: 'flags_streak'; streak: number; count: number }  // Get N flags to a right-streak of `streak`
  | { type: 'flags_streak_all'; streak: number }             // Get ALL flags to a right-streak of `streak`
  | { type: 'mode_play'; mode: GameMode; count: number }     // Play a specific mode N times (total questions)
  | { type: 'mode_correct'; mode: GameMode; count: number }  // Get N correct in a specific mode
  | { type: 'modes_played'; count: number }                  // Play N different game modes
  | { type: 'games_played'; count: number }                  // Play N total games
  | { type: 'total_correct'; count: number }                 // Get N total correct answers
  | { type: 'accuracy_overall'; pct: number; minGames: number } // Maintain N% accuracy with min games
  | { type: 'category_correct'; category: CategoryId; count: number } // Get N correct in a category
  | { type: 'category_accuracy'; category: CategoryId; pct: number; minTotal: number } // N% accuracy in category
  | { type: 'day_streak'; days: number }                     // Achieve a day streak of N
  | { type: 'best_time_attack'; score: number }              // Score N+ in timed quiz
  | { type: 'badges_earned'; count: number }                 // Earn N badges
  | { type: 'avg_speed'; ms: number; minCorrect: number };   // Average answer speed under N ms

// ─── Level definition ─────────────────────────────────────────
export interface LevelDef {
  level: number;
  requirement: LevelRequirement;
}

// ─── Level progress result ────────────────────────────────────
export interface LevelProgress {
  currentLevel: number;      // Highest completed level (0 = none)
  nextLevel: number;         // Next level to achieve
  progress: number;          // Current progress toward next level
  target: number;            // Target for next level
  pct: number;               // 0-100 percentage
  description: string;       // Human-readable description of next goal
  isMaxLevel: boolean;       // True if all 100 levels complete
}

// ─── Playable modes (excludes hidden modes) ───────────────────
const PLAYABLE_MODES: GameMode[] = [
  'easy', 'medium', 'hard', 'flashflag', 'flagpuzzle',
  'timeattack', 'neighbors', 'impostor', 'capitalconnection',
];

// ─── Context for evaluation ───────────────────────────────────
export interface LevelContext {
  stats: UserStats;
  flagStats: FlagStats;
  badgeData: BadgeData;
  dayStreakInfo: DayStreakInfo;
}

// Cached evaluation context to avoid re-computing Object.values/getTotalFlagCount per level
interface EvalCache {
  entries: { wrong: number; right: number; rightStreak: number; totalTimeRight?: number; totalTimeWrong?: number }[];
  totalFlags: number;
}

// ─── Evaluate a single requirement ────────────────────────────
// Returns { progress, target } - level is complete when progress >= target
export function evaluateRequirement(
  req: LevelRequirement,
  ctx: LevelContext,
  cache?: EvalCache,
): { progress: number; target: number } {
  const entries = cache?.entries ?? Object.values(ctx.flagStats);
  const totalFlags = cache?.totalFlags ?? getTotalFlagCount();

  switch (req.type) {
    case 'flags_correct_once': {
      const seen = entries.filter((s) => s.right >= 1).length;
      return { progress: seen, target: req.count };
    }
    case 'flags_correct_n': {
      const qualified = entries.filter((s) => s.right >= req.times).length;
      return { progress: qualified, target: req.count };
    }
    case 'flags_correct_all': {
      const qualified = entries.filter((s) => s.right >= req.times).length;
      return { progress: qualified, target: totalFlags };
    }
    case 'flags_fast': {
      // Flags answered correctly with average time under threshold
      const fast = entries.filter((s) => {
        if (!s.totalTimeRight || s.right === 0) return false;
        return (s.totalTimeRight / s.right) < req.seconds * 1000;
      }).length;
      return { progress: fast, target: req.count };
    }
    case 'flags_fast_all': {
      const fast = entries.filter((s) => {
        if (!s.totalTimeRight || s.right === 0) return false;
        return (s.totalTimeRight / s.right) < req.seconds * 1000;
      }).length;
      return { progress: fast, target: totalFlags };
    }
    case 'flags_streak': {
      const streaked = entries.filter((s) => s.rightStreak >= req.streak).length;
      return { progress: streaked, target: req.count };
    }
    case 'flags_streak_all': {
      const streaked = entries.filter((s) => s.rightStreak >= req.streak).length;
      return { progress: streaked, target: totalFlags };
    }
    case 'mode_play': {
      const ms = ctx.stats.modeStats[req.mode];
      return { progress: ms ? ms.total : 0, target: req.count };
    }
    case 'mode_correct': {
      const ms = ctx.stats.modeStats[req.mode];
      return { progress: ms ? ms.correct : 0, target: req.count };
    }
    case 'modes_played': {
      const played = PLAYABLE_MODES.filter((m) => ctx.stats.modeStats[m]?.total > 0).length;
      return { progress: played, target: req.count };
    }
    case 'games_played': {
      return { progress: ctx.stats.totalGamesPlayed, target: req.count };
    }
    case 'total_correct': {
      return { progress: ctx.stats.totalCorrect, target: req.count };
    }
    case 'accuracy_overall': {
      if (ctx.stats.totalAnswered < req.minGames) {
        return { progress: ctx.stats.totalAnswered, target: req.minGames };
      }
      const acc = ctx.stats.totalAnswered > 0
        ? Math.round((ctx.stats.totalCorrect / ctx.stats.totalAnswered) * 100) : 0;
      return { progress: acc, target: req.pct };
    }
    case 'category_correct': {
      const cs = ctx.stats.categoryStats[req.category];
      return { progress: cs ? cs.correct : 0, target: req.count };
    }
    case 'category_accuracy': {
      const cs = ctx.stats.categoryStats[req.category];
      if (!cs || cs.total < req.minTotal) {
        return { progress: cs ? cs.total : 0, target: req.minTotal };
      }
      const acc = Math.round((cs.correct / cs.total) * 100);
      return { progress: acc, target: req.pct };
    }
    case 'day_streak': {
      const best = ctx.dayStreakInfo.best;
      return { progress: best, target: req.days };
    }
    case 'best_time_attack': {
      return { progress: ctx.stats.bestTimeAttackScore || 0, target: req.score };
    }
    case 'badges_earned': {
      return { progress: ctx.badgeData.earnedBadgeIds.length, target: req.count };
    }
    case 'avg_speed': {
      if (ctx.stats.totalCorrectCount < req.minCorrect) {
        return { progress: ctx.stats.totalCorrectCount, target: req.minCorrect };
      }
      const avg = ctx.stats.totalCorrectCount > 0
        ? Math.round(ctx.stats.totalCorrectTimeMs / ctx.stats.totalCorrectCount) : 99999;
      // For speed, lower is better. Show as complete when avg <= target ms.
      return { progress: avg <= req.ms ? req.ms : Math.max(0, req.ms - (avg - req.ms)), target: req.ms };
    }
  }
}

// ─── Generate description for a requirement ───────────────────
export function describeRequirement(req: LevelRequirement): string {
  switch (req.type) {
    case 'flags_correct_once':
      return t('stats.reqFlagsOnce', { count: req.count });
    case 'flags_correct_n':
      return t('stats.reqFlagsN', { count: req.count, times: req.times });
    case 'flags_correct_all':
      return req.times === 1
        ? t('stats.reqFlagsAllOnce')
        : t('stats.reqFlagsAllN', { times: req.times });
    case 'flags_fast':
      return t('stats.reqFlagsFast', { count: req.count, seconds: req.seconds });
    case 'flags_fast_all':
      return t('stats.reqFlagsFastAll', { seconds: req.seconds });
    case 'flags_streak':
      return t('stats.reqFlagsStreak', { streak: req.streak, count: req.count });
    case 'flags_streak_all':
      return t('stats.reqFlagsStreakAll', { streak: req.streak });
    case 'mode_play':
      return t('stats.reqModePlay', { count: req.count, mode: t(`modes.${req.mode}`) });
    case 'mode_correct':
      return t('stats.reqModeCorrect', { count: req.count, mode: t(`modes.${req.mode}`) });
    case 'modes_played':
      return t('stats.reqModesPlayed', { count: req.count });
    case 'games_played':
      return t('stats.reqGamesPlayed', { count: req.count });
    case 'total_correct':
      return t('stats.reqTotalCorrect', { count: req.count });
    case 'accuracy_overall':
      return t('stats.reqAccuracy', { pct: req.pct, min: req.minGames });
    case 'category_correct':
      return t('stats.reqCategoryCorrect', { count: req.count, category: t(`categories.${req.category}`) });
    case 'category_accuracy':
      return t('stats.reqCategoryAccuracy', { pct: req.pct, category: t(`categories.${req.category}`), min: req.minTotal });
    case 'day_streak':
      return t('stats.reqDayStreak', { days: req.days });
    case 'best_time_attack':
      return t('stats.reqTimeAttack', { score: req.score });
    case 'badges_earned':
      return t('stats.reqBadges', { count: req.count });
    case 'avg_speed':
      return t('stats.reqAvgSpeed', { seconds: (req.ms / 1000).toFixed(1) });
  }
}

// ─── 100 Level definitions ────────────────────────────────────
// Progression arc:
//   1-10:   Getting started - basic flag identification, first games
//   11-20:  Building breadth - see more flags, try modes
//   21-35:  Deepening mastery - repeat accuracy, regions
//   36-50:  Speed and skill - faster answers, harder modes
//   51-65:  Completionist - all flags, all modes, categories
//   66-80:  Expert challenges - high accuracy, streaks, speed
//   81-95:  Master tier - per-flag mastery, combo requirements
//   96-100: Legend tier - ultimate achievements

export const LEVELS: LevelDef[] = [
  // ── Getting Started (1-10) ──
  { level: 1, requirement: { type: 'flags_correct_once', count: 1 } },
  { level: 2, requirement: { type: 'games_played', count: 3 } },
  { level: 3, requirement: { type: 'flags_correct_once', count: 10 } },
  { level: 4, requirement: { type: 'total_correct', count: 20 } },
  { level: 5, requirement: { type: 'flags_correct_once', count: 25 } },
  { level: 6, requirement: { type: 'games_played', count: 5 } },
  { level: 7, requirement: { type: 'flags_correct_once', count: 40 } },
  { level: 8, requirement: { type: 'modes_played', count: 2 } },
  { level: 9, requirement: { type: 'total_correct', count: 50 } },
  { level: 10, requirement: { type: 'flags_correct_once', count: 50 } },

  // ── Building Breadth (11-20) ──
  { level: 11, requirement: { type: 'games_played', count: 10 } },
  { level: 12, requirement: { type: 'flags_correct_once', count: 75 } },
  { level: 13, requirement: { type: 'day_streak', days: 2 } },
  { level: 14, requirement: { type: 'total_correct', count: 100 } },
  { level: 15, requirement: { type: 'flags_correct_once', count: 100 } },
  { level: 16, requirement: { type: 'modes_played', count: 3 } },
  { level: 17, requirement: { type: 'flags_correct_n', count: 50, times: 2 } },
  { level: 18, requirement: { type: 'category_correct', category: 'europe', count: 20 } },
  { level: 19, requirement: { type: 'total_correct', count: 200 } },
  { level: 20, requirement: { type: 'flags_correct_once', count: 130 } },

  // ── Deepening Mastery (21-35) ──
  { level: 21, requirement: { type: 'flags_correct_all', times: 1 } },
  { level: 22, requirement: { type: 'games_played', count: 25 } },
  { level: 23, requirement: { type: 'day_streak', days: 3 } },
  { level: 24, requirement: { type: 'category_correct', category: 'africa', count: 25 } },
  { level: 25, requirement: { type: 'flags_correct_n', count: 100, times: 2 } },
  { level: 26, requirement: { type: 'modes_played', count: 4 } },
  { level: 27, requirement: { type: 'category_correct', category: 'asia', count: 25 } },
  { level: 28, requirement: { type: 'total_correct', count: 400 } },
  { level: 29, requirement: { type: 'flags_correct_n', count: 50, times: 3 } },
  { level: 30, requirement: { type: 'badges_earned', count: 5 } },
  { level: 31, requirement: { type: 'category_correct', category: 'americas', count: 20 } },
  { level: 32, requirement: { type: 'flags_correct_all', times: 2 } },
  { level: 33, requirement: { type: 'best_time_attack', score: 8 } },
  { level: 34, requirement: { type: 'category_correct', category: 'oceania', count: 10 } },
  { level: 35, requirement: { type: 'flags_correct_n', count: 100, times: 3 } },

  // ── Speed and Skill (36-50) ──
  { level: 36, requirement: { type: 'mode_correct', mode: 'hard', count: 25 } },
  { level: 37, requirement: { type: 'games_played', count: 50 } },
  { level: 38, requirement: { type: 'flags_fast', seconds: 10, count: 50 } },
  { level: 39, requirement: { type: 'day_streak', days: 5 } },
  { level: 40, requirement: { type: 'flags_correct_all', times: 3 } },
  { level: 41, requirement: { type: 'modes_played', count: 5 } },
  { level: 42, requirement: { type: 'total_correct', count: 750 } },
  { level: 43, requirement: { type: 'mode_correct', mode: 'capitalconnection', count: 25 } },
  { level: 44, requirement: { type: 'best_time_attack', score: 12 } },
  { level: 45, requirement: { type: 'flags_fast', seconds: 8, count: 75 } },
  { level: 46, requirement: { type: 'category_accuracy', category: 'europe', pct: 75, minTotal: 30 } },
  { level: 47, requirement: { type: 'mode_correct', mode: 'neighbors', count: 30 } },
  { level: 48, requirement: { type: 'flags_correct_n', count: 150, times: 3 } },
  { level: 49, requirement: { type: 'badges_earned', count: 8 } },
  { level: 50, requirement: { type: 'flags_correct_all', times: 4 } },

  // ── Completionist (51-65) ──
  { level: 51, requirement: { type: 'total_correct', count: 1000 } },
  { level: 52, requirement: { type: 'modes_played', count: 6 } },
  { level: 53, requirement: { type: 'mode_correct', mode: 'impostor', count: 30 } },
  { level: 54, requirement: { type: 'category_accuracy', category: 'africa', pct: 70, minTotal: 30 } },
  { level: 55, requirement: { type: 'flags_correct_all', times: 5 } },
  { level: 56, requirement: { type: 'day_streak', days: 7 } },
  { level: 57, requirement: { type: 'flags_fast', seconds: 7, count: 100 } },
  { level: 58, requirement: { type: 'games_played', count: 75 } },
  { level: 59, requirement: { type: 'mode_correct', mode: 'hard', count: 50 } },
  { level: 60, requirement: { type: 'best_time_attack', score: 15 } },
  { level: 61, requirement: { type: 'category_accuracy', category: 'asia', pct: 75, minTotal: 30 } },
  { level: 62, requirement: { type: 'flags_streak', streak: 3, count: 100 } },
  { level: 63, requirement: { type: 'mode_correct', mode: 'flagpuzzle', count: 30 } },
  { level: 64, requirement: { type: 'total_correct', count: 1500 } },
  { level: 65, requirement: { type: 'modes_played', count: 7 } },

  // ── Expert Challenges (66-80) ──
  { level: 66, requirement: { type: 'flags_correct_all', times: 7 } },
  { level: 67, requirement: { type: 'category_accuracy', category: 'americas', pct: 80, minTotal: 25 } },
  { level: 68, requirement: { type: 'best_time_attack', score: 18 } },
  { level: 69, requirement: { type: 'flags_fast', seconds: 6, count: 100 } },
  { level: 70, requirement: { type: 'games_played', count: 100 } },
  { level: 71, requirement: { type: 'mode_correct', mode: 'hard', count: 100 } },
  { level: 72, requirement: { type: 'badges_earned', count: 12 } },
  { level: 73, requirement: { type: 'category_accuracy', category: 'oceania', pct: 85, minTotal: 12 } },
  { level: 74, requirement: { type: 'flags_streak', streak: 3, count: 150 } },
  { level: 75, requirement: { type: 'total_correct', count: 2000 } },
  { level: 76, requirement: { type: 'day_streak', days: 10 } },
  { level: 77, requirement: { type: 'flags_fast', seconds: 5, count: 100 } },
  { level: 78, requirement: { type: 'mode_correct', mode: 'capitalconnection', count: 75 } },
  { level: 79, requirement: { type: 'category_accuracy', category: 'europe', pct: 85, minTotal: 35 } },
  { level: 80, requirement: { type: 'flags_correct_all', times: 10 } },

  // ── Master Tier (81-95) ──
  { level: 81, requirement: { type: 'modes_played', count: 8 } },
  { level: 82, requirement: { type: 'total_correct', count: 2500 } },
  { level: 83, requirement: { type: 'best_time_attack', score: 20 } },
  { level: 84, requirement: { type: 'flags_fast', seconds: 5, count: 150 } },
  { level: 85, requirement: { type: 'category_accuracy', category: 'africa', pct: 85, minTotal: 40 } },
  { level: 86, requirement: { type: 'flags_streak', streak: 5, count: 100 } },
  { level: 87, requirement: { type: 'day_streak', days: 14 } },
  { level: 88, requirement: { type: 'mode_correct', mode: 'neighbors', count: 75 } },
  { level: 89, requirement: { type: 'badges_earned', count: 15 } },
  { level: 90, requirement: { type: 'flags_correct_all', times: 15 } },
  { level: 91, requirement: { type: 'total_correct', count: 3500 } },
  { level: 92, requirement: { type: 'flags_fast', seconds: 4, count: 100 } },
  { level: 93, requirement: { type: 'category_accuracy', category: 'asia', pct: 90, minTotal: 40 } },
  { level: 94, requirement: { type: 'modes_played', count: 9 } },
  { level: 95, requirement: { type: 'flags_streak', streak: 5, count: 150 } },

  // ── Legend Tier (96-100) ──
  { level: 96, requirement: { type: 'day_streak', days: 21 } },
  { level: 97, requirement: { type: 'best_time_attack', score: 25 } },
  { level: 98, requirement: { type: 'total_correct', count: 5000 } },
  { level: 99, requirement: { type: 'badges_earned', count: 20 } },
  { level: 100, requirement: { type: 'flags_streak_all', streak: 5 } },
];

export const MAX_LEVEL = LEVELS.length;

// ─── Tier labels for UI grouping ──────────────────────────────
export type LevelTier = 'starter' | 'explorer' | 'scholar' | 'expert' | 'master' | 'legend';

export function getLevelTier(level: number): LevelTier {
  if (level <= 10) return 'starter';
  if (level <= 20) return 'explorer';
  if (level <= 40) return 'scholar';
  if (level <= 65) return 'expert';
  if (level <= 95) return 'master';
  return 'legend';
}

export function getTierLabel(tier: LevelTier): string {
  return t(`stats.tier${tier.charAt(0).toUpperCase() + tier.slice(1)}`);
}

// ─── Compute current level progress ──────────────────────────
// Scans all levels sequentially. Uses persistedLevel as a floor
// so levels are one-way doors (never regress).
export function computeLevelProgress(ctx: LevelContext, persistedLevel: number = 0): LevelProgress {
  let currentLevel = persistedLevel;
  // Build cache once so Object.values and getTotalFlagCount aren't repeated per level
  const cache: EvalCache = { entries: Object.values(ctx.flagStats), totalFlags: getTotalFlagCount() };

  for (const levelDef of LEVELS) {
    // Levels at or below the persisted floor are already completed
    if (levelDef.level <= persistedLevel) {
      currentLevel = Math.max(currentLevel, levelDef.level);
      continue;
    }
    const { progress, target } = evaluateRequirement(levelDef.requirement, ctx, cache);
    if (progress >= target) {
      currentLevel = levelDef.level;
    } else {
      // This is the next level to achieve
      return {
        currentLevel,
        nextLevel: levelDef.level,
        progress,
        target,
        pct: target > 0 ? Math.min(100, Math.round((progress / target) * 100)) : 0,
        description: describeRequirement(levelDef.requirement),
        isMaxLevel: false,
      };
    }
  }

  // All 100 levels complete
  return {
    currentLevel: MAX_LEVEL,
    nextLevel: MAX_LEVEL,
    progress: 1,
    target: 1,
    pct: 100,
    description: t('stats.levelMaxed'),
    isMaxLevel: true,
  };
}
