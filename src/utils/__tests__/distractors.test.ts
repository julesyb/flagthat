/**
 * Tests for pickDistractors: wrong answers should test real knowledge.
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
jest.mock('../../types', () => ({ BASELINE_REGIONS: [] }));
jest.mock('../../data', () => ({ getFlagsForCategory: jest.fn(), getAllFlags: jest.fn() }));
jest.mock('../../data/countryAliases', () => ({ countryAliases: {}, twinPairs: {} }));
jest.mock('../../data/countryNames', () => ({ translateName: (s: string) => s }));
jest.mock('../../data/countryCapitals', () => ({ countryCapitals: {} }));
jest.mock('../i18n', () => ({ t: (key: string) => key }));

import { pickDistractors } from '../gameEngine';
import { FlagItem } from '../../types';

const flag = (id: string, name: string, region: string): FlagItem => ({ id, name, emoji: '', region, tags: [] });

const romania = flag('ro', 'Romania', 'Europe');
const pool: FlagItem[] = [
  romania,
  flag('td', 'Chad', 'Africa'),
  flag('md', 'Moldova', 'Europe'),
  flag('fr', 'France', 'Europe'),
  flag('it', 'Italy', 'Europe'),
  flag('de', 'Germany', 'Europe'),
  flag('jp', 'Japan', 'Asia'),
  flag('br', 'Brazil', 'Americas'),
  flag('ke', 'Kenya', 'Africa'),
];
const twins = ['Chad', 'Moldova'];

describe('pickDistractors', () => {
  it('never includes the correct flag and never repeats', () => {
    for (let i = 0; i < 50; i++) {
      const picks = pickDistractors(romania, pool, 3, 'medium', twins);
      expect(picks).toHaveLength(3);
      expect(picks.map((f) => f.id)).not.toContain('ro');
      expect(new Set(picks.map((f) => f.id)).size).toBe(3);
    }
  });

  it('medium puts look-alikes first, then the same region', () => {
    for (let i = 0; i < 50; i++) {
      const picks = pickDistractors(romania, pool, 3, 'medium', twins);
      const names = picks.map((f) => f.name);
      expect(names).toEqual(expect.arrayContaining(['Chad', 'Moldova']));
      const third = picks.find((f) => !twins.includes(f.name));
      expect(third?.region).toBe('Europe');
    }
  });

  it('easy avoids look-alikes and the same region', () => {
    for (let i = 0; i < 50; i++) {
      const [pick] = pickDistractors(romania, pool, 1, 'easy', twins);
      expect(twins).not.toContain(pick.name);
      expect(pick.region).not.toBe('Europe');
    }
  });

  it('falls back to other tiers when the pool is small', () => {
    const tiny = [romania, flag('md', 'Moldova', 'Europe')];
    expect(pickDistractors(romania, tiny, 1, 'easy', twins).map((f) => f.name)).toEqual(['Moldova']);
    expect(pickDistractors(romania, tiny, 3, 'medium', twins)).toHaveLength(1);
  });
});
