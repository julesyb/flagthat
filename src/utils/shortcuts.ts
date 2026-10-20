/**
 * Pure helpers for keyboard shortcuts and swipe gestures.
 * Kept free of React and react-native so they can be unit tested.
 */

/** Letter keys that pick an answer, in order (a = first option). */
const ANSWER_LETTERS = 'abcdefghi';

/**
 * Maps a key press to an answer index: '1'-'9' or 'a'-'i' (any case).
 * Returns null when the key doesn't map to one of `count` options.
 */
export function answerIndexFromKey(key: string, count: number): number | null {
  if (key.length !== 1) return null;
  let index = -1;
  if (key >= '1' && key <= '9') index = Number(key) - 1;
  else index = ANSWER_LETTERS.indexOf(key.toLowerCase());
  return index >= 0 && index < count ? index : null;
}

/** Enter or Space: continue, submit, or play. */
export function isContinueKey(key: string): boolean {
  return key === 'Enter' || key === ' ';
}

/** Key name to direction (-1 back, +1 forward) for arrow keys, or 0. */
export function arrowStep(key: string, axis: 'horizontal' | 'vertical' | 'both'): -1 | 0 | 1 {
  const h = axis !== 'vertical';
  const v = axis !== 'horizontal';
  if ((h && key === 'ArrowLeft') || (v && key === 'ArrowUp')) return -1;
  if ((h && key === 'ArrowRight') || (v && key === 'ArrowDown')) return 1;
  return 0;
}

/** The item next to `current` in `order`, or null at either end (no wrap). */
export function adjacentItem<T>(order: readonly T[], current: T, step: -1 | 1): T | null {
  const i = order.indexOf(current);
  if (i < 0) return null;
  return order[i + step] ?? null;
}

export type SwipeDirection = 'left' | 'right' | 'up' | 'down';

/** Distance (px) a finger must travel for a swipe, unless it's a quick flick. */
export const SWIPE_DISTANCE = 60;
/** Speed (px/ms) that counts as a flick even over a short distance. */
export const SWIPE_VELOCITY = 0.5;
/** Movement (px) before a gesture is treated as a swipe rather than a tap. */
export const SWIPE_SLOP = 12;

/**
 * True once a drag has moved far enough along one axis, and mostly along it,
 * to be claimed as a swipe. Keeps taps and vertical scrolls working.
 */
export function isSwipeStart(dx: number, dy: number, axis: 'horizontal' | 'vertical' | 'both'): boolean {
  const ax = Math.abs(dx);
  const ay = Math.abs(dy);
  const h = axis !== 'vertical' && ax > SWIPE_SLOP && ax > ay * 2;
  const v = axis !== 'horizontal' && ay > SWIPE_SLOP && ay > ax * 2;
  return h || v;
}

/**
 * The direction of a finished drag, or null if it was too short or too diagonal.
 * dx/dy are total distance, vx/vy are release speed.
 */
export function swipeDirection(dx: number, dy: number, vx: number, vy: number): SwipeDirection | null {
  const ax = Math.abs(dx);
  const ay = Math.abs(dy);
  if (ax > ay * 1.5) {
    if (ax >= SWIPE_DISTANCE || (ax >= SWIPE_SLOP && Math.abs(vx) >= SWIPE_VELOCITY)) {
      return dx < 0 ? 'left' : 'right';
    }
    return null;
  }
  if (ay > ax * 1.5) {
    if (ay >= SWIPE_DISTANCE || (ay >= SWIPE_SLOP && Math.abs(vy) >= SWIPE_VELOCITY)) {
      return dy < 0 ? 'up' : 'down';
    }
  }
  return null;
}
