/**
 * Tests for flag rotation: ensures the same flag isn't shown again until the
 * rest of the pool has been seen first. Verifies both the pure utility
 * (rotateByLeastRecentlyShown) and the storage cache hooks that feed it.
 */

jest.mock('../config', () => ({
  MS_PER_DAY: 86400000,
  MASTERED_STREAK: 5,
  UNLOCK_THRESHOLD: 0.8,
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
  generateQuestions,
  shuffleArray,
} from '../gameEngine';
import {
  primeFlagLastShownCache,
  recordFlagsShown,
  getFlagLastShownSync,
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
  mockedGetFlagsForCategory.mockReset();
});

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
    // c has no record, so it comes first; then a (1000), then b (2000)
    expect(out[0].id).toBe('c');
    expect(out[1].id).toBe('a');
    expect(out[2].id).toBe('b');
  });

  it('randomises ties so selection still feels fresh', () => {
    const items = makeFlags(['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h']);
    // All never shown - ties across the whole pool.
    const orders = new Set<string>();
    for (let i = 0; i < 20; i++) {
      const out = rotateByLeastRecentlyShown(items, (f) => f.id, {});
      orders.add(out.map((f) => f.id).join(','));
    }
    // Extremely unlikely to get the same order 20 times by chance.
    expect(orders.size).toBeGreaterThan(1);
  });

  it('reads from the cached last-shown map when not provided', async () => {
    await recordFlagsShown(['b']);
    const items = makeFlags(['a', 'b']);
    const out = rotateByLeastRecentlyShown(items, (f) => f.id);
    // a (never shown) comes before b (just recorded)
    expect(out[0].id).toBe('a');
    expect(out[1].id).toBe('b');
  });

  it('accepts plain string ids via custom extractor', () => {
    const ids = ['a', 'b', 'c'];
    const lastShown = { a: 2000, b: 500, c: 1000 };
    const out = rotateByLeastRecentlyShown(ids, (id) => id, lastShown);
    expect(out).toEqual(['b', 'c', 'a']);
  });
});

describe('generateQuestions rotation', () => {
  it('never repeats a flag until the whole pool has been cycled', async () => {
    const pool = makeFlags(['a', 'b', 'c', 'd', 'e']);
    mockedGetFlagsForCategory.mockReturnValue(pool);

    const seenInFirstCycle = new Set<string>();
    // Play 5 games, each picking one flag. After 5 games every flag should
    // have been seen exactly once.
    for (let i = 0; i < pool.length; i++) {
      const qs = generateQuestions({
        mode: 'medium',
        category: 'all' as any,
        questionCount: 1,
        displayMode: 'flag',
      });
      expect(qs).toHaveLength(1);
      const id = qs[0].flag.id;
      expect(seenInFirstCycle.has(id)).toBe(false);
      seenInFirstCycle.add(id);
      // Simulate the Results screen recording the shown flag.
      await recordFlagsShown([id]);
    }
    expect(seenInFirstCycle.size).toBe(pool.length);
  });

  it('prefers the oldest flag when there is a clear age gap', async () => {
    const pool = makeFlags(['recent1', 'recent2', 'recent3', 'stale']);
    mockedGetFlagsForCategory.mockReturnValue(pool);

    // Pretend "stale" was shown six weeks ago and the rest were shown today.
    const now = Date.now();
    const sixWeeksAgo = now - 42 * 86400000;
    await recordFlagsShown(['stale']);
    // Manually backdate stale's timestamp in the cache to simulate the "6 weeks ago" case.
    const cache = getFlagLastShownSync();
    cache.stale = sixWeeksAgo;
    cache.recent1 = now;
    cache.recent2 = now;
    cache.recent3 = now;

    // Pick a single-question game: stale should always win.
    for (let i = 0; i < 10; i++) {
      const qs = generateQuestions({
        mode: 'medium',
        category: 'all' as any,
        questionCount: 1,
        displayMode: 'flag',
      });
      expect(qs[0].flag.id).toBe('stale');
    }
  });

  it('cycles through a filtered category pool before repeating', async () => {
    const pool = makeFlags(['eu1', 'eu2', 'eu3']);
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
      order.push(id);
      await recordFlagsShown([id]);
    }
    expect(new Set(order).size).toBe(pool.length);
  });
});

describe('recordFlagsShown persistence', () => {
  it('persists timestamps through the cache to AsyncStorage', async () => {
    await recordFlagsShown(['a', 'b']);

    // Cache is updated synchronously.
    const cached = getFlagLastShownSync();
    expect(cached.a).toBeDefined();
    expect(cached.b).toBeDefined();

    // A fresh prime from AsyncStorage sees the same data.
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

// Sanity: shuffleArray still produces a permutation so rotation callers get
// fair randomisation of ties.
describe('shuffleArray sanity', () => {
  it('returns a permutation of its input', () => {
    const input = ['a', 'b', 'c', 'd', 'e'];
    const out = shuffleArray(input);
    expect(out.sort()).toEqual([...input].sort());
  });
});
