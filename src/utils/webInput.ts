import { Platform } from 'react-native';

/**
 * Web-only input helpers: what kind of pointer the device has, and moving
 * keyboard focus between buttons. Every function is a safe no-op on iOS and Android.
 */

function matches(query: string): boolean {
  if (Platform.OS !== 'web' || typeof window === 'undefined' || !window.matchMedia) return false;
  try {
    return window.matchMedia(query).matches;
  } catch {
    return false;
  }
}

/** Web on a device with a mouse or trackpad, where keyboard shortcuts make sense. */
export function hasKeyboardWeb(): boolean {
  return matches('(any-pointer: fine)');
}

/**
 * Whether swipe gestures should be on. Always on native. On web only for touch
 * screens, so dragging with a mouse (e.g. to select text) never changes screens.
 */
export function swipesEnabled(): boolean {
  if (Platform.OS !== 'web') return true;
  return matches('(pointer: coarse)');
}

/** True while a dialog (an RN Modal) is open on web. */
export function isWebDialogOpen(): boolean {
  if (Platform.OS !== 'web' || typeof document === 'undefined') return false;
  return document.querySelector('[role="dialog"][aria-modal="true"]') !== null;
}

const FOCUSABLE = '[role="button"], [role="tab"], [role="link"], button, input, textarea';

function isDisabled(el: Element): boolean {
  return el.getAttribute('aria-disabled') === 'true' || el.hasAttribute('disabled');
}

/** True for a focused element the browser will press on Enter or Space itself. */
export function isPressableTarget(target: EventTarget | null): boolean {
  if (typeof HTMLElement === 'undefined' || !(target instanceof HTMLElement)) return false;
  const role = target.getAttribute('role');
  const pressable = target.tagName === 'BUTTON' || role === 'button' || role === 'tab' || role === 'link';
  return pressable && !isDisabled(target);
}

/**
 * Moves keyboard focus to the next (step 1) or previous (step -1) visible,
 * enabled control. Controls inside the element with id `skipWithinId` are
 * passed over. Returns true when focus moved.
 */
export function moveWebFocus(step: -1 | 1, skipWithinId?: string): boolean {
  if (Platform.OS !== 'web' || typeof document === 'undefined') return false;
  const nodes = Array.from(document.querySelectorAll<HTMLElement>(FOCUSABLE)).filter((el) => {
    if (el.offsetParent === null || isDisabled(el) || el.tabIndex < 0) return false;
    if (skipWithinId && el.closest(`#${skipWithinId}`)) return false;
    return true;
  });
  if (nodes.length === 0) return false;

  const current = nodes.indexOf(document.activeElement as HTMLElement);
  let next: number;
  if (current < 0) next = step > 0 ? 0 : nodes.length - 1;
  else next = Math.min(nodes.length - 1, Math.max(0, current + step));
  if (next === current) return false;
  nodes[next].focus();
  return true;
}
