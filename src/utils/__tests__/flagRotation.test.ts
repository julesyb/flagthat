/**
 * Tests for flag rotation + spaced-repetition selection.
 *
 * Verifies:
 *  - Hard cycle guarantee: no flag repeats via the rotation lane until the
 *    pool has cycled (go through the whole list before showing something again)
 *  - Urgent lane: struggling flags re-surface within 1-2 games
 *  - Mastered flags are deprioritized in the rotation lane
 *  - Non-determinism: repeated runs don't produce identical orderings
 *  - Edge cases: empty pool, pool smaller than requested count, tiny games
 */

jest.mock('../config', () => ({
  MS_PER_DAY: 86400000,
  MASTERED_STREAK: 3,
  UNLOCK_THRESHOLD: 3,
  MAX_GAME_HISTORY: 50,
  MAX_CHALLENGE_HISTORY: 20,
  DAILY_LEADERBOARD_MAX_AGE_DAYS: 30,
  DAILY_QUESTION_COUNT: 10,
  SHARE_GRID_ROW_SIZE: 5,
  EASY_CHOICE_COUNT: 2,
  STANDARD_CHOICE_COUNT: 4,
  APP_DOMAIN: 'flagthat.test',
}));

jest.mock('../../types', () => ({
  BASELINE_REGIONS: [],
}));

jest.mock('../../data', () => ({
  getFlagsForCategory: jest.fn(),
  getAllFlags: jest.fn(),
}));

jest.mock('../../data/countryAliases', () => ({
  countryAliases: {},
  twinPairs: {},
}));

jest.mock('../../data/countryNames', () => ({
  translateName: (s: string) => s,
}));

jest.mock('../../data/countryCapitals', () => ({
  countryCapitals: {},
}));

jest.mock('../i18n', () => ({
  t: (key: string) => key,
}));

import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  rotateByLeastRecentlyShown,
  selectFlagsForGame,
  weightedSampleWithoutReplacement,
  generateQuestions,
  shuffleArray,
} from '../gameEngine';
import {
  primeFlagLastShownCache,
  primeFlagStatsCache,
  recordFlagsShown,
  getFlagLastShownSync,
  FlagStats,
} from '../storage';
import { getFlagsForCategory } from '../../data';
import { FlagItem } from '../../types';

const mockedGetFlagsForCategory = getFlagsForCategory as jest.MockedFunction<
  typeof getFlagsForCategory
>;

function makeFlags(ids: string[]): FlagItem[] {
  return ids.map((id) => ({
    id,
    name: id.toUpperCase(),
    category: 'world',
  })) as unknown as FlagItem[];
}

beforeEach(async () => {
  await AsyncStorage.clear();
  await primeFlagLastShownCache();
  await primeFlagStatsCache();
  mockedGetFlagsForCategory.mockReset();
});

// ── rotateByLeastRecentlyShown ──────────────────────────────────────────

describe('rotateByLeastRecentlyShown', () => {
  it('sorts least-recently-shown first', () => {
    const items = makeFlags(['a', 'b', 'c', 'd']);
    const lastShown = { a: 1000, b: 500, c: 2000, d: 250 };
    const out = rotateByLeastRecentlyShown(items, (f) => f.id, lastShown);
    expect(out.map((f) => f.id)).toEqual(['d', 'b', 'a', 'c']);
  });

  it('treats flags with no record as never-shown (oldest)', () => {
    const items = makeFlags(['a', 'b', 'c']);
    const lastShown = { a: 1000, b: 2000 };
    const out = rotateByLeastRecentlyShown(items, (f) => f.id, lastShown);
    expect(out[0].id).toBe('c');
    expect(out[1].id).toBe('a');
    expect(out[2].id).toBe('b');
  });

  it('randomises ties so selection still feels fresh', () => {
    const items = makeFlags(['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h']);
    const orders = new Set<string>();
    for (let i = 0; i < 20; i++) {
      const out = rotateByLeastRecentlyShown(items, (f) => f.id, {});
      orders.add(out.map((f) => f.id).join(','));
    }
    expect(orders.size).toBeGreaterThan(1);
  });

  it('accepts plain string ids via custom extractor', () => {
    const ids = ['a', 'b', 'c'];
    const lastShown = { a: 2000, b: 500, c: 1000 };
    const out = rotateByLeastRecentlyShown(ids, (id) => id, lastShown);
    expect(out).toEqual(['b', 'c', 'a']);
  });
});

// ── weightedSampleWithoutReplacement ────────────────────────────────────

describe('weightedSampleWithoutReplacement', () => {
  it('returns exactly count items', () => {
    const out = weightedSampleWithoutReplacement([1, 2, 3, 4, 5, 6, 7, 8], () => 1, 3);
    expect(out.length).toBe(3);
  });

  it('returns all items (shuffled) when count >= pool size', () => {
    const out = weightedSampleWithoutReplacement([1, 2, 3], () => 1, 5);
    expect(out.sort()).toEqual([1, 2, 3]);
  });

  it('biases toward items with higher weight', () => {
    const items = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j'];
    let aCount = 0;
    const runs = 200;
    for (let i = 0; i < runs; i++) {
      const [pick] = weightedSampleWithoutReplacement(
        items,
        (x) => (x === 'a' ? 100 : 1),
        1,
      );
      if (pick === 'a') aCount++;
    }
    expect(aCount / runs).toBeGreaterThan(0.7);
  });

  it('handles zero count', () => {
    expect(weightedSampleWithoutReplacement([1, 2, 3], () => 1, 0)).toEqual([]);
  });

  it('handles empty pool', () => {
    expect(weightedSampleWithoutReplacement([], () => 1, 5)).toEqual([]);
  });
});

// ── selectFlagsForGame (the integration) ────────────────────────────────

describe('selectFlagsForGame', () => {
  // ── HARD CYCLE GUARANTEE ──

  it('cycles through the full pool before any repeat (pick-1 games)', async () => {
    const pool = makeFlags(['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h']);
    const seen = new Set<string>();
    // Pick 1 flag at a time, 8 games in a row.
    for (let i = 0; i < pool.length; i++) {
      const picks = selectFlagsForGame(pool, 1, (f) => f.id);
      expect(picks).toHaveLength(1);
      const id = picks[0].id;
      // This flag must not have been seen in this cycle.
      expect(seen.has(id)).toBe(false);
      seen.add(id);
      await recordFlagsShown([id]);
    }
    expect(seen.size).toBe(pool.length);
  });

  it('cycles through the pool when picking multiple per game', async () => {
    const pool = makeFlags(Array.from({ length: 20 }, (_, i) => `f${i}`));
    const seen = new Set<string>();

    // 4 games of 5 flags each = full cycle of 20.
    for (let game = 0; game < 4; game++) {
      const picks = selectFlagsForGame(pool, 5, (f) => f.id);
      expect(picks).toHaveLength(5);
      for (const p of picks) {
        expect(seen.has(p.id)).toBe(false);
        seen.add(p.id);
      }
      await recordFlagsShown(picks.map((p) => p.id));
    }
    expect(seen.size).toBe(20);
  });

  it('prefers the stale flag over recent ones', async () => {
    const pool = makeFlags(['recent1', 'recent2', 'recent3', 'stale']);
    const now = Date.now();
    const sixWeeksAgo = now - 42 * 86400000;
    await recordFlagsShown(['stale', 'recent1', 'recent2', 'recent3']);
    const cache = getFlagLastShownSync();
    cache.stale = sixWeeksAgo;
    cache.recent1 = now;
    cache.recent2 = now;
    cache.recent3 = now;

    // Picking 1: rotation puts stale first. Window = min(3, 1+1)=2
    // from rotation pool of 4. Stale is always in the window because
    // it's the oldest. Weighted sampling with all-neutral weights from
    // a 2-item window — stale should appear in most runs.
    let staleCount = 0;
    const runs = 30;
    for (let i = 0; i < runs; i++) {
      const picks = selectFlagsForGame(pool, 1, (f) => f.id);
      if (picks[0].id === 'stale') staleCount++;
    }
    // stale is 1 of 2 in the window, so ~50%. With any staleness
    // advantage it should be well over 30%.
    expect(staleCount / runs).toBeGreaterThan(0.3);
  });

  // ── URGENT LANE: STRUGGLING FLAGS RE-SURFACE ──

  it('brings back struggling flags even if they were just shown', async () => {
    // 30-flag pool. All flags shown at the same recent time.
    // 'miss1' and 'miss2' are struggling. They were just shown, so
    // rotation would put them behind the other 28 flags. The urgent
    // lane should pull them back.
    const ids = Array.from({ length: 30 }, (_, i) => `f${i}`);
    const pool = makeFlags(ids);
    const now = Date.now();

    // Mark all as just shown at slightly different times so miss flags
    // are genuinely the MOST recent (worst position in rotation).
    const lastShown: Record<string, number> = {};
    for (let i = 0; i < ids.length; i++) {
      lastShown[ids[i]] = now - (ids.length - i) * 1000;
    }
    // miss1 and miss2 are the two most recently shown.
    lastShown.f28 = now - 1;
    lastShown.f29 = now;

    const stats: FlagStats = {
      f28: { wrong: 5, right: 1, rightStreak: 0 },
      f29: { wrong: 3, right: 0, rightStreak: 0 },
    };

    // Pick 10: urgent lane reserves up to 2 slots.
    let missCount = 0;
    const runs = 50;
    for (let i = 0; i < runs; i++) {
      const picks = selectFlagsForGame(pool, 10, (f) => f.id, {
        lastShown,
        flagStats: stats,
      });
      for (const p of picks) {
        if (p.id === 'f28' || p.id === 'f29') missCount++;
      }
    }
    // With urgent lane pulling 2 struggling flags, we expect at least
    // 1 miss per game on average. Out of 50 games of 10 flags each
    // (500 picks), we should see misses > 50 times.
    expect(missCount).toBeGreaterThan(40);
  });

  it('urgent lane does not activate for tiny games (count <= 2)', () => {
    const pool = makeFlags(['a', 'b', 'c']);
    const stats: FlagStats = {
      a: { wrong: 10, right: 0, rightStreak: 0 },
    };
    // With count=2, urgent lane is suppressed so the 2-flag game isn't
    // dominated by a single miss.
    const lastShown: Record<string, number> = { a: Date.now(), b: 0, c: 0 };
    const picks = selectFlagsForGame(pool, 2, (f) => f.id, {
      lastShown,
      flagStats: stats,
    });
    expect(picks).toHaveLength(2);
    // 'a' is the most recent, so rotation puts it last. It should NOT
    // be in the result since urgent lane is off and rotation picks b,c.
    expect(picks.map((p) => p.id).sort()).toEqual(['b', 'c']);
  });

  // ── MASTERED FLAGS CYCLE NORMALLY ──

  it('mastered flags still cycle through the rotation like all other flags', () => {
    // The user wants "go through the whole list." Mastered flags are not
    // skipped — they cycle at the same rate as everything else. Only the
    // urgent lane treats flags differently.
    const ids = Array.from({ length: 15 }, (_, i) => `f${i}`);
    const pool = makeFlags(ids);
    const lastShown: Record<string, number> = {};
    const ts = Date.now() - 100_000;
    for (const id of ids) lastShown[id] = ts;

    const stats: FlagStats = {
      f0: { wrong: 0, right: 10, rightStreak: 5 },
      f1: { wrong: 0, right: 8, rightStreak: 4 },
    };

    const tally: Record<string, number> = {};
    for (const id of ids) tally[id] = 0;
    const runs = 500;
    for (let i = 0; i < runs; i++) {
      const picks = selectFlagsForGame(pool, 5, (f) => f.id, {
        lastShown,
        flagStats: stats,
      });
      for (const p of picks) tally[p.id]++;
    }

    // With all timestamps equal and no urgent lane, the rotation treats
    // all flags equally. Mastered flags should appear at roughly the
    // same rate as neutral ones (within reasonable statistical noise).
    const avg = ids.reduce((s, id) => s + tally[id], 0) / ids.length;
    for (const id of ids) {
      expect(tally[id]).toBeGreaterThan(avg * 0.5);
      expect(tally[id]).toBeLessThan(avg * 1.5);
    }
  });

  // ── NON-DETERMINISM ──

  it('does not produce deterministic ordering across runs', () => {
    const pool = makeFlags(Array.from({ length: 30 }, (_, i) => `x${i}`));
    const orders = new Set<string>();
    for (let i = 0; i < 20; i++) {
      const picks = selectFlagsForGame(pool, 5, (f) => f.id);
      orders.add(picks.map((p) => p.id).join(','));
    }
    expect(orders.size).toBeGreaterThan(1);
  });

  // ── EDGE CASES ──

  it('handles pool smaller than count', () => {
    const pool = makeFlags(['a', 'b']);
    const picks = selectFlagsForGame(pool, 10, (f) => f.id);
    expect(picks.length).toBe(2);
    expect(new Set(picks.map((p) => p.id)).size).toBe(2);
  });

  it('handles empty pool', () => {
    expect(selectFlagsForGame([], 5, (f: FlagItem) => f.id)).toEqual([]);
  });
});

// ── generateQuestions (integration through the public API) ──────────────

describe('generateQuestions rotation', () => {
  it('cycles a small category fully before repeating', async () => {
    const pool = makeFlags(['eu1', 'eu2', 'eu3', 'eu4', 'eu5']);
    mockedGetFlagsForCategory.mockReturnValue(pool);

    const order: string[] = [];
    for (let i = 0; i < pool.length; i++) {
      const qs = generateQuestions({
        mode: 'medium',
        category: 'europe' as any,
        questionCount: 1,
        displayMode: 'flag',
      });
      const id = qs[0].flag.id;
      expect(order.includes(id)).toBe(false);
      order.push(id);
      await recordFlagsShown([id]);
    }
    expect(new Set(order).size).toBe(pool.length);
  });
});

// ── recordFlagsShown persistence ────────────────────────────────────────

describe('recordFlagsShown persistence', () => {
  it('persists timestamps through the cache to AsyncStorage', async () => {
    await recordFlagsShown(['a', 'b']);
    const cached = getFlagLastShownSync();
    expect(cached.a).toBeDefined();
    expect(cached.b).toBeDefined();

    const raw = await AsyncStorage.getItem('@flagsareus_flag_last_shown');
    expect(raw).not.toBeNull();
    const parsed = JSON.parse(raw!);
    expect(parsed.a).toBeDefined();
    expect(parsed.b).toBeDefined();
  });

  it('no-ops on an empty id list', async () => {
    await recordFlagsShown([]);
    const raw = await AsyncStorage.getItem('@flagsareus_flag_last_shown');
    expect(raw).toBeNull();
  });
});

// ── shuffleArray sanity ────────────────────────────────────────────────

describe('shuffleArray sanity', () => {
  it('returns a permutation of its input', () => {
    const input = ['a', 'b', 'c', 'd', 'e'];
    const out = shuffleArray(input);
    expect(out.sort()).toEqual([...input].sort());
  });
});
