/**
 * Tests for levels.ts evaluateRequirement, focusing on the avg_speed case.
 */

// Mock dependencies that pull in react-native
jest.mock('../i18n', () => ({
  t: (key: string) => key,
}));
jest.mock('../../data', () => ({
  getTotalFlagCount: () => 197,
  getCategoryCount: () => 50,
}));

import { evaluateRequirement, LevelRequirement, LevelContext } from '../levels';
import { UserStats } from '../../types';

function makeContext(overrides: Partial<UserStats> = {}): LevelContext {
  const stats: UserStats = {
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
    ...overrides,
  };
  return {
    stats,
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
    expect(result.progress).toBe(20);
    expect(result.target).toBe(50);
  });

  it('returns target when average speed is exactly at threshold', () => {
    // avg = 3000ms, threshold = 3000ms, avg <= ms is true
    const ctx = makeContext({ totalCorrectCount: 50, totalCorrectTimeMs: 150000 });
    const result = evaluateRequirement(req, ctx);
    expect(result.progress).toBe(req.ms); // 3000
    expect(result.target).toBe(req.ms);   // 3000
  });

  it('returns target when average speed is below threshold (faster)', () => {
    // avg = 2000ms, threshold = 3000ms
    const ctx = makeContext({ totalCorrectCount: 50, totalCorrectTimeMs: 100000 });
    const result = evaluateRequirement(req, ctx);
    expect(result.progress).toBe(req.ms);
    expect(result.target).toBe(req.ms);
  });

  it('returns partial progress when average speed is above threshold (slower)', () => {
    // avg = 4000ms, threshold = 3000ms
    // progress = max(0, 3000 - (4000 - 3000)) = max(0, 2000) = 2000
    const ctx = makeContext({ totalCorrectCount: 50, totalCorrectTimeMs: 200000 });
    const result = evaluateRequirement(req, ctx);
    expect(result.progress).toBe(2000);
    expect(result.target).toBe(3000);
  });

  it('clamps progress to 0 when average is very slow', () => {
    // avg = 7000ms, threshold = 3000ms
    // progress = max(0, 3000 - (7000 - 3000)) = max(0, -1000) = 0
    const ctx = makeContext({ totalCorrectCount: 50, totalCorrectTimeMs: 350000 });
    const result = evaluateRequirement(req, ctx);
    expect(result.progress).toBe(0);
    expect(result.target).toBe(3000);
  });

  it('returns 99999 progress formula when totalCorrectCount is 0 but minCorrect is met (edge case)', () => {
    // This is a quirky edge: totalCorrectCount=0 but somehow >= minCorrect=0
    const zeroReq: LevelRequirement = { type: 'avg_speed', ms: 3000, minCorrect: 0 };
    const ctx = makeContext({ totalCorrectCount: 0, totalCorrectTimeMs: 0 });
    const result = evaluateRequirement(zeroReq, ctx);
    // avg = 99999 (fallback), avg > ms, progress = max(0, 3000 - (99999 - 3000)) = 0
    expect(result.progress).toBe(0);
    expect(result.target).toBe(3000);
  });
});

describe('evaluateRequirement - flags_correct_once', () => {
  it('counts flags with at least one correct answer', () => {
    const req: LevelRequirement = { type: 'flags_correct_once', count: 100 };
    const ctx = makeContext();
    ctx.flagStats = {
      US: { wrong: 0, right: 3, rightStreak: 3 },
      FR: { wrong: 1, right: 1, rightStreak: 1 },
      DE: { wrong: 2, right: 0, rightStreak: 0 },
    };
    const result = evaluateRequirement(req, ctx);
    expect(result.progress).toBe(2); // US and FR
    expect(result.target).toBe(100);
  });
});

describe('evaluateRequirement - day_streak', () => {
  it('uses best streak from dayStreakInfo', () => {
    const req: LevelRequirement = { type: 'day_streak', days: 7 };
    const ctx = makeContext();
    ctx.dayStreakInfo = { current: 3, best: 5 };
    const result = evaluateRequirement(req, ctx);
    expect(result.progress).toBe(5);
    expect(result.target).toBe(7);
  });
});

describe('evaluateRequirement - badges_earned', () => {
  it('counts earned badge IDs', () => {
    const req: LevelRequirement = { type: 'badges_earned', count: 5 };
    const ctx = makeContext();
    ctx.badgeData = { dailyChallengesCompleted: 0, hasShared: false, earnedBadgeIds: ['a', 'b', 'c'] };
    const result = evaluateRequirement(req, ctx);
    expect(result.progress).toBe(3);
    expect(result.target).toBe(5);
  });
});
