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
  isMaxLevel: boolean;       // True if all 10 levels complete
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

// ─── 10 Level definitions ─────────────────────────────────────
// Each level forces a different activity so you can't skip ahead.
//   1-3:   Core difficulty mastery (easy, medium, hard)
//   4-8:   Explore every game mode (one mode per level)
//   9:     Prove all-mode breadth (play all 9 modes)
//   10:    Ultimate mastery (every flag right 10 times)

export const LEVELS: LevelDef[] = [
  // ── Core Difficulty (1-3) ──
  { level: 1, requirement: { type: 'mode_correct', mode: 'easy', count: 197 } },
  { level: 2, requirement: { type: 'mode_correct', mode: 'medium', count: 197 } },
  { level: 3, requirement: { type: 'mode_correct', mode: 'hard', count: 197 } },

  // ── Mode Exploration (4-8) ──
  { level: 4, requirement: { type: 'mode_correct', mode: 'flashflag', count: 100 } },
  { level: 5, requirement: { type: 'mode_correct', mode: 'neighbors', count: 100 } },
  { level: 6, requirement: { type: 'mode_correct', mode: 'flagpuzzle', count: 100 } },
  { level: 7, requirement: { type: 'mode_correct', mode: 'capitalconnection', count: 100 } },
  { level: 8, requirement: { type: 'mode_correct', mode: 'impostor', count: 100 } },

  // ── Full Mastery (9-10) ──
  { level: 9, requirement: { type: 'modes_played', count: 9 } },
  { level: 10, requirement: { type: 'flags_correct_all', times: 10 } },
];

export const MAX_LEVEL = LEVELS.length;

// ─── Tier labels for UI grouping ──────────────────────────────
export type LevelTier = 'starter' | 'expert' | 'master';

export function getLevelTier(level: number): LevelTier {
  if (level <= 3) return 'starter';
  if (level <= 8) return 'expert';
  return 'master';
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

  // All 10 levels complete
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
