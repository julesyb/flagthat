import { GameResult } from '../types';

/** Count correct answers in a results array. */
export function countCorrect(results: GameResult[]): number {
  return results.filter((r) => r.correct).length;
}

/** Count wrong answers in a results array. */
export function countWrong(results: GameResult[]): number {
  return results.filter((r) => !r.correct).length;
}

/** Calculate progress fraction (0-1) for question-based game screens. */
export function calculateProgress(currentIndex: number, total: number): number {
  return total > 0 ? (currentIndex + 1) / total : 0;
}
