/**
 * Tests for gameHelpers utility functions.
 */

import { countCorrect, countWrong, calculateProgress } from '../gameHelpers';
import { GameResult } from '../../types';

// Minimal GameResult factory - only the fields the helpers inspect
function makeResult(correct: boolean): GameResult {
  return {
    question: { flag: { id: 'US', name: 'United States', region: 'americas' }, options: ['United States'] },
    userAnswer: correct ? 'United States' : 'Canada',
    correct,
    timeTaken: 1000,
  } as GameResult;
}

describe('countCorrect', () => {
  it('returns 0 for empty array', () => {
    expect(countCorrect([])).toBe(0);
  });

  it('counts correct results', () => {
    const results = [makeResult(true), makeResult(false), makeResult(true), makeResult(true)];
    expect(countCorrect(results)).toBe(3);
  });

  it('returns 0 when all wrong', () => {
    const results = [makeResult(false), makeResult(false)];
    expect(countCorrect(results)).toBe(0);
  });

  it('returns full count when all correct', () => {
    const results = [makeResult(true), makeResult(true), makeResult(true)];
    expect(countCorrect(results)).toBe(3);
  });
});

describe('countWrong', () => {
  it('returns 0 for empty array', () => {
    expect(countWrong([])).toBe(0);
  });

  it('counts wrong results', () => {
    const results = [makeResult(true), makeResult(false), makeResult(true), makeResult(false)];
    expect(countWrong(results)).toBe(2);
  });

  it('returns full count when all wrong', () => {
    const results = [makeResult(false), makeResult(false), makeResult(false)];
    expect(countWrong(results)).toBe(3);
  });
});

describe('calculateProgress', () => {
  it('returns 0 when total is 0', () => {
    expect(calculateProgress(0, 0)).toBe(0);
  });

  it('returns correct fraction for first question', () => {
    // currentIndex=0, total=10 -> (0+1)/10 = 0.1
    expect(calculateProgress(0, 10)).toBeCloseTo(0.1);
  });

  it('returns correct fraction for middle question', () => {
    // currentIndex=4, total=10 -> (4+1)/10 = 0.5
    expect(calculateProgress(4, 10)).toBeCloseTo(0.5);
  });

  it('returns 1.0 for last question', () => {
    // currentIndex=9, total=10 -> (9+1)/10 = 1.0
    expect(calculateProgress(9, 10)).toBeCloseTo(1.0);
  });

  it('handles single-question game', () => {
    expect(calculateProgress(0, 1)).toBeCloseTo(1.0);
  });
});
