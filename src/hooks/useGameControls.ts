import { useKeyShortcuts } from './useKeyShortcuts';
import { useSwipe } from './useSwipe';
import { answerIndexFromKey, isContinueKey } from '../utils/shortcuts';
import { hapticTap } from '../utils/feedback';

interface GameControlsOptions {
  /** How many answers 1-9 / A-I can pick from. */
  optionCount?: number;
  onPick?: (index: number) => void;
  /** Answers are open (no feedback showing, nothing else on top). */
  canPick?: boolean;
  /** Next question, submit, or see results. */
  onContinue?: () => void;
  canContinue?: boolean;
  /** Swipe left also continues. Defaults to canContinue; turn off where continuing submits an answer. */
  canSwipe?: boolean;
}

/**
 * Shared game controls. Keyboard (web): 1-9 or A-I pick an answer, Enter or
 * Space continues. Touch: swipe left continues. Spread the returned handlers
 * on the screen's root view.
 */
export function useGameControls({
  optionCount = 0,
  onPick,
  canPick = false,
  onContinue,
  canContinue = false,
  canSwipe = canContinue,
}: GameControlsOptions) {
  useKeyShortcuts((key) => {
    if (canPick && onPick) {
      const index = answerIndexFromKey(key, optionCount);
      if (index !== null) {
        onPick(index);
        return true;
      }
    }
    if (canContinue && onContinue && isContinueKey(key)) {
      onContinue();
      return true;
    }
    return false;
  });

  return useSwipe({
    enabled: canSwipe && !!onContinue,
    onSwipe: (direction) => {
      if (direction !== 'left' || !onContinue) return false;
      hapticTap();
      onContinue();
      return true;
    },
  });
}
