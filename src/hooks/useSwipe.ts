import { useMemo, useRef } from 'react';
import { PanResponder, GestureResponderHandlers } from 'react-native';
import { isSwipeStart, swipeDirection, SwipeDirection } from '../utils/shortcuts';
import { swipesEnabled } from '../utils/webInput';

interface SwipeOptions {
  /** Called on a finished swipe. Return false if it wasn't used (e.g. no tab that way). */
  onSwipe: (direction: SwipeDirection) => boolean | void;
  /** Which way the gesture can go. Defaults to horizontal so vertical scrolling still works. */
  axis?: 'horizontal' | 'vertical' | 'both';
  enabled?: boolean;
  /** Live drag distance, for views that follow the finger. */
  onDrag?: (dx: number, dy: number) => void;
  /** Gesture finished. `used` is true when onSwipe took it. */
  onEnd?: (used: boolean) => void;
}

function fitsAxis(direction: SwipeDirection, axis: SwipeOptions['axis']): boolean {
  const horizontal = direction === 'left' || direction === 'right';
  if (axis === 'both') return true;
  return axis === 'vertical' ? !horizontal : horizontal;
}

/**
 * Swipe gestures on any View: spread the returned handlers onto it.
 * Only claims a touch once it clearly moves along the axis, so taps, buttons and
 * scroll views inside keep working. On web this is on for touch screens only.
 */
export function useSwipe(options: SwipeOptions): GestureResponderHandlers {
  const optsRef = useRef(options);
  optsRef.current = options;
  const allowed = useMemo(() => swipesEnabled(), []);

  const responder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, g) => {
          const o = optsRef.current;
          return allowed && o.enabled !== false && isSwipeStart(g.dx, g.dy, o.axis ?? 'horizontal');
        },
        onPanResponderMove: (_, g) => optsRef.current.onDrag?.(g.dx, g.dy),
        onPanResponderRelease: (_, g) => {
          const o = optsRef.current;
          const direction = swipeDirection(g.dx, g.dy, g.vx, g.vy);
          const used = !!direction && fitsAxis(direction, o.axis ?? 'horizontal') && o.onSwipe(direction) !== false;
          o.onEnd?.(used);
        },
        onPanResponderTerminate: () => optsRef.current.onEnd?.(false),
        onPanResponderTerminationRequest: () => true,
      }),
    [allowed],
  );

  return responder.panHandlers;
}
