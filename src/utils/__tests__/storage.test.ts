/**
 * Tests for storage.ts day streak logic.
 * We test getDayStreakInfo and recordDayPlayed by calling the public API.
 */

// Mock react-native (handled by jest.config.js moduleNameMapper)

jest.mock('../config', () => ({
  MS_PER_DAY: 86400000,
  MASTERED_STREAK: 5,
  UNLOCK_THRESHOLD: 0.8,
  MAX_GAME_HISTORY: 50,
  MAX_CHALLENGE_HISTORY: 20,
  DAILY_LEADERBOARD_MAX_AGE_DAYS: 30,
}));

jest.mock('../../types', () => ({
  BASELINE_REGIONS: [],
}));

import AsyncStorage from '@react-native-async-storage/async-storage';
import { getDayStreakInfo, DayStreakInfo } from '../storage';

const DAY_STREAK_KEY = '@flagsareus_day_streak';

// Helper to set stored streak data directly
async function setStreakData(data: { lastDate: string; streak: number; best?: number }) {
  await AsyncStorage.setItem(DAY_STREAK_KEY, JSON.stringify(data));
}

// We need to mock getTodayDate since it's a private function.
// The function reads new Date(), so we mock Date to control "today".
function mockToday(dateStr: string) {
  const fixedDate = new Date(dateStr + 'T12:00:00');
  jest.spyOn(global, 'Date').mockImplementation((...args: any[]) => {
    if (args.length === 0) return fixedDate;
    // @ts-ignore - allow calling new Date with args
    return new (Function.prototype.bind.apply(OriginalDate, [null, ...args]))();
  });
}

const OriginalDate = global.Date;

beforeEach(() => {
  // Clear the mock store between tests
  (AsyncStorage as any)._clear();
  jest.restoreAllMocks();
});

afterAll(() => {
  jest.restoreAllMocks();
});

describe('getDayStreakInfo', () => {
  it('returns { current: 0, best: 0 } when no data stored', async () => {
    mockToday('2026-03-30');
    const info = await getDayStreakInfo();
    expect(info).toEqual({ current: 0, best: 0 });
  });

  it('returns current streak when lastDate is today', async () => {
    mockToday('2026-03-30');
    await setStreakData({ lastDate: '2026-03-30', streak: 5, best: 10 });
    const info = await getDayStreakInfo();
    expect(info.current).toBe(5);
    expect(info.best).toBe(10);
  });

  it('returns current streak when lastDate is yesterday (consecutive day)', async () => {
    mockToday('2026-03-30');
    await setStreakData({ lastDate: '2026-03-29', streak: 3, best: 7 });
    const info = await getDayStreakInfo();
    // diffDays = 1, so streak continues
    expect(info.current).toBe(3);
    expect(info.best).toBe(7);
  });

  it('resets current streak to 0 when lastDate is 2+ days ago', async () => {
    mockToday('2026-03-30');
    await setStreakData({ lastDate: '2026-03-28', streak: 5, best: 10 });
    const info = await getDayStreakInfo();
    // diffDays = 2, so streak resets
    expect(info.current).toBe(0);
    expect(info.best).toBe(10); // best is preserved
  });

  it('resets current streak when gap is large (e.g. a week)', async () => {
    mockToday('2026-03-30');
    await setStreakData({ lastDate: '2026-03-23', streak: 14, best: 14 });
    const info = await getDayStreakInfo();
    expect(info.current).toBe(0);
    expect(info.best).toBe(14);
  });

  it('handles month boundary correctly (March 1 after Feb 28)', async () => {
    mockToday('2026-03-01');
    await setStreakData({ lastDate: '2026-02-28', streak: 4, best: 4 });
    const info = await getDayStreakInfo();
    // Feb 28 -> Mar 1 = 1 day difference
    expect(info.current).toBe(4);
    expect(info.best).toBe(4);
  });

  it('handles year boundary correctly (Jan 1 after Dec 31)', async () => {
    mockToday('2027-01-01');
    await setStreakData({ lastDate: '2026-12-31', streak: 10, best: 10 });
    const info = await getDayStreakInfo();
    expect(info.current).toBe(10);
    expect(info.best).toBe(10);
  });

  it('falls back best to streak when best field missing (legacy data)', async () => {
    mockToday('2026-03-30');
    await setStreakData({ lastDate: '2026-03-30', streak: 3 });
    const info = await getDayStreakInfo();
    expect(info.current).toBe(3);
    expect(info.best).toBe(3); // best falls back to streak
  });

  it('handles diffDays calculation with DST-safe T00:00:00 parsing', async () => {
    // The code appends T00:00:00 to date strings to avoid DST issues
    mockToday('2026-03-09'); // Day after spring forward in US
    await setStreakData({ lastDate: '2026-03-08', streak: 2, best: 5 });
    const info = await getDayStreakInfo();
    // Even around DST, the T00:00:00 approach should give diffDays = 1
    expect(info.current).toBe(2);
  });
});
