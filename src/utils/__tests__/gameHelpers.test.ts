/**
 * Tests for gameHelpers utility functions.
 */
import { countCorrect, countWrong, calculateProgress } from '../gameHelpers';
import { GameResult } from '../../types';

function makeResult(correct: boolean): GameResult {
  return {
    question: {
      flag: { id: 'US', name: 'United States', category: 'north-america' } as any,
      options: ['United States', 'Canada', 'Mexico', 'Brazil'],
    },
    userAnswer: correct ? 'United States' : 'Canada',
    correct,
    timeTaken: 2000,
  };
}

describe('countCorrect', () => {
  it('returns 0 for empty array', () => {
    expect(countCorrect([])).toBe(0);
  });

  it('counts all correct', () => {
    const results = [makeResult(true), makeResult(true), makeResult(true)];
    expect(countCorrect(results)).toBe(3);
  });

  it('counts none correct', () => {
    const results = [makeResult(false), makeResult(false)];
    expect(countCorrect(results)).toBe(0);
  });

  it('counts mixed results', () => {
    const results = [makeResult(true), makeResult(false), makeResult(true), makeResult(false), makeResult(true)];
    expect(countCorrect(results)).toBe(3);
  });
});

describe('countWrong', () => {
  it('returns 0 for empty array', () => {
    expect(countWrong([])).toBe(0);
  });

  it('counts all wrong', () => {
    const results = [makeResult(false), makeResult(false), makeResult(false)];
    expect(countWrong(results)).toBe(3);
  });

  it('counts none wrong', () => {
    const results = [makeResult(true), makeResult(true)];
    expect(countWrong(results)).toBe(0);
  });

  it('counts mixed results', () => {
    const results = [makeResult(true), makeResult(false), makeResult(true), makeResult(false)];
    expect(countWrong(results)).toBe(2);
  });

  it('countCorrect + countWrong equals total', () => {
    const results = [makeResult(true), makeResult(false), makeResult(true)];
    expect(countCorrect(results) + countWrong(results)).toBe(results.length);
  });
});

describe('calculateProgress', () => {
  it('returns 0 when total is 0', () => {
    expect(calculateProgress(0, 0)).toBe(0);
  });

  it('returns correct fraction for first question', () => {
    expect(calculateProgress(0, 10)).toBeCloseTo(0.1);
  });

  it('returns correct fraction for middle question', () => {
    expect(calculateProgress(4, 10)).toBeCloseTo(0.5);
  });

  it('returns 1 for last question', () => {
    expect(calculateProgress(9, 10)).toBeCloseTo(1.0);
  });

  it('returns correct fraction for single question', () => {
    expect(calculateProgress(0, 1)).toBeCloseTo(1.0);
  });
});
