import {
  answerIndexFromKey,
  isContinueKey,
  arrowStep,
  adjacentItem,
  isSwipeStart,
  swipeDirection,
} from '../shortcuts';

describe('answerIndexFromKey', () => {
  it('maps number keys to zero-based indexes', () => {
    expect(answerIndexFromKey('1', 4)).toBe(0);
    expect(answerIndexFromKey('4', 4)).toBe(3);
  });

  it('maps letter keys in either case', () => {
    expect(answerIndexFromKey('a', 4)).toBe(0);
    expect(answerIndexFromKey('D', 4)).toBe(3);
  });

  it('rejects keys past the option count', () => {
    expect(answerIndexFromKey('5', 4)).toBeNull();
    expect(answerIndexFromKey('e', 4)).toBeNull();
    expect(answerIndexFromKey('0', 4)).toBeNull();
  });

  it('rejects other keys', () => {
    expect(answerIndexFromKey('Enter', 4)).toBeNull();
    expect(answerIndexFromKey(' ', 4)).toBeNull();
    expect(answerIndexFromKey('z', 4)).toBeNull();
    expect(answerIndexFromKey('?', 4)).toBeNull();
  });
});

describe('isContinueKey', () => {
  it('accepts Enter and Space only', () => {
    expect(isContinueKey('Enter')).toBe(true);
    expect(isContinueKey(' ')).toBe(true);
    expect(isContinueKey('Escape')).toBe(false);
    expect(isContinueKey('a')).toBe(false);
  });
});

describe('arrowStep', () => {
  it('reads horizontal arrows', () => {
    expect(arrowStep('ArrowLeft', 'horizontal')).toBe(-1);
    expect(arrowStep('ArrowRight', 'horizontal')).toBe(1);
    expect(arrowStep('ArrowUp', 'horizontal')).toBe(0);
  });

  it('reads vertical arrows', () => {
    expect(arrowStep('ArrowUp', 'vertical')).toBe(-1);
    expect(arrowStep('ArrowDown', 'vertical')).toBe(1);
    expect(arrowStep('ArrowLeft', 'vertical')).toBe(0);
  });

  it('reads all arrows on both axes', () => {
    expect(arrowStep('ArrowLeft', 'both')).toBe(-1);
    expect(arrowStep('ArrowDown', 'both')).toBe(1);
    expect(arrowStep('Enter', 'both')).toBe(0);
  });
});

describe('adjacentItem', () => {
  const tabs = ['Home', 'Modes', 'Stats'] as const;

  it('steps forward and back', () => {
    expect(adjacentItem(tabs, 'Modes', 1)).toBe('Stats');
    expect(adjacentItem(tabs, 'Modes', -1)).toBe('Home');
  });

  it('does not wrap at the ends', () => {
    expect(adjacentItem(tabs, 'Home', -1)).toBeNull();
    expect(adjacentItem(tabs, 'Stats', 1)).toBeNull();
  });

  it('returns null for an unknown item', () => {
    expect(adjacentItem<string>(tabs, 'Settings', 1)).toBeNull();
  });
});

describe('isSwipeStart', () => {
  it('ignores tiny moves', () => {
    expect(isSwipeStart(5, 0, 'horizontal')).toBe(false);
  });

  it('claims mostly-horizontal drags on the horizontal axis', () => {
    expect(isSwipeStart(30, 5, 'horizontal')).toBe(true);
    expect(isSwipeStart(30, 20, 'horizontal')).toBe(false);
    expect(isSwipeStart(0, 30, 'horizontal')).toBe(false);
  });

  it('claims mostly-vertical drags on the vertical axis', () => {
    expect(isSwipeStart(2, 30, 'vertical')).toBe(true);
    expect(isSwipeStart(30, 2, 'vertical')).toBe(false);
  });

  it('claims either on both axes', () => {
    expect(isSwipeStart(30, 2, 'both')).toBe(true);
    expect(isSwipeStart(2, 30, 'both')).toBe(true);
    expect(isSwipeStart(30, 30, 'both')).toBe(false);
  });
});

describe('swipeDirection', () => {
  it('detects long swipes', () => {
    expect(swipeDirection(-80, 5, 0, 0)).toBe('left');
    expect(swipeDirection(80, 5, 0, 0)).toBe('right');
    expect(swipeDirection(5, 80, 0, 0)).toBe('down');
    expect(swipeDirection(5, -80, 0, 0)).toBe('up');
  });

  it('detects short quick flicks', () => {
    expect(swipeDirection(-30, 0, -0.8, 0)).toBe('left');
    expect(swipeDirection(0, 30, 0, 0.8)).toBe('down');
  });

  it('ignores short slow drags', () => {
    expect(swipeDirection(-30, 0, -0.1, 0)).toBeNull();
  });

  it('ignores diagonal drags', () => {
    expect(swipeDirection(80, 70, 0, 0)).toBeNull();
  });
});
