/**
 * Tests for levels.ts evaluateRequirement, focusing on the avg_speed case.
 */

// Mock dependencies
jest.mock('../../data', () => ({
  getAllFlags: () => [],
  getTotalFlagCount: () => 197,
  getCategoryCount: () => 50,
}));
jest.mock('../../data/countryAliases', () => ({
  twinPairs: [],
}));
jest.mock('../i18n', () => ({
  t: (key: string, params?: Record<string, unknown>) => {
    if (params) return `${key}:${JSON.stringify(params)}`;
    return key;
  },
}));

import { evaluateRequirement, LevelRequirement, LevelContext } from '../levels';

function makeContext(overrides: Partial<LevelContext['stats']> = {}): LevelContext {
  return {
    stats: {
      totalGamesPlayed: 10,
      totalCorrect: 80,
      totalAnswered: 100,
      bestStreak: 5,
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
      ...overrides,
    },
    flagStats: {},
    badgeData: { dailyChallengesCompleted: 0, hasShared: false, earnedBadgeIds: [] },
    dayStreakInfo: { current: 0, best: 0 },
  };
}

describe('evaluateRequirement - avg_speed', () => {
  const req: LevelRequirement = { type: 'avg_speed', ms: 3000, minCorrect: 50 };

  it('returns progress toward minCorrect when not enough answers', () => {
    const ctx = makeContext({ totalCorrectCount: 20, totalCorrectTimeMs: 40000 });
    const result = evaluateRequirement(req, ctx);
    // Not enough correct answers yet, so progress shows count toward minCorrect
    expect(result.progress).toBe(20);
    expect(result.target).toBe(50);
  });

  it('shows complete when average speed is under threshold', () => {
    // Average: 50000 / 50 = 1000ms, which is under 3000ms
    const ctx = makeContext({ totalCorrectCount: 50, totalCorrectTimeMs: 50000 });
    const result = evaluateRequirement(req, ctx);
    // avg (1000) <= req.ms (3000), so progress = req.ms = 3000
    expect(result.progress).toBe(3000);
    expect(result.target).toBe(3000);
    expect(result.progress >= result.target).toBe(true);
  });

  it('shows complete when average speed equals threshold exactly', () => {
    // Average: 150000 / 50 = 3000ms exactly
    const ctx = makeContext({ totalCorrectCount: 50, totalCorrectTimeMs: 150000 });
    const result = evaluateRequirement(req, ctx);
    expect(result.progress).toBe(3000);
    expect(result.target).toBe(3000);
    expect(result.progress >= result.target).toBe(true);
  });

  it('shows incomplete when average speed is over threshold', () => {
    // Average: 250000 / 50 = 5000ms, which is over 3000ms
    const ctx = makeContext({ totalCorrectCount: 50, totalCorrectTimeMs: 250000 });
    const result = evaluateRequirement(req, ctx);
    // avg=5000, over=2000, progress = max(0, 3000 - 2000) = 1000
    expect(result.progress).toBe(1000);
    expect(result.target).toBe(3000);
    expect(result.progress >= result.target).toBe(false);
  });

  it('handles zero totalCorrectTimeMs with sufficient count', () => {
    // avg = 0 / 50 = 0ms, which is <= 3000, so complete
    const ctx = makeContext({ totalCorrectCount: 50, totalCorrectTimeMs: 0 });
    const result = evaluateRequirement(req, ctx);
    expect(result.progress).toBe(3000);
    expect(result.target).toBe(3000);
  });
});

describe('evaluateRequirement - flags_correct_once', () => {
  it('counts flags seen at least once', () => {
    const ctx = makeContext();
    ctx.flagStats = {
      US: { wrong: 0, right: 3, rightStreak: 3 },
      FR: { wrong: 1, right: 1, rightStreak: 0 },
      DE: { wrong: 2, right: 0, rightStreak: 0 },
    };
    const req: LevelRequirement = { type: 'flags_correct_once', count: 100 };
    const result = evaluateRequirement(req, ctx);
    expect(result.progress).toBe(2); // US and FR have right >= 1
    expect(result.target).toBe(100);
  });
});

describe('evaluateRequirement - mode_correct', () => {
  it('returns correct count for a specific mode', () => {
    const ctx = makeContext();
    ctx.stats.modeStats.easy = { correct: 42, total: 60 };
    const req: LevelRequirement = { type: 'mode_correct', mode: 'easy', count: 197 };
    const result = evaluateRequirement(req, ctx);
    expect(result.progress).toBe(42);
    expect(result.target).toBe(197);
  });
});

describe('evaluateRequirement - day_streak', () => {
  it('uses best streak from dayStreakInfo', () => {
    const ctx = makeContext();
    ctx.dayStreakInfo = { current: 3, best: 7 };
    const req: LevelRequirement = { type: 'day_streak', days: 10 };
    const result = evaluateRequirement(req, ctx);
    expect(result.progress).toBe(7);
    expect(result.target).toBe(10);
  });
});
