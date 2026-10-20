import { useContext, useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import { NavigationContext } from '@react-navigation/native';
import { isContinueKey } from '../utils/shortcuts';
import { isPressableTarget, isWebDialogOpen } from '../utils/webInput';
import { isShortcutsHelpOpen } from '../utils/shortcutsHelp';

/**
 * Keyboard shortcuts for the web build. The handler gets each key press
 * (e.g. 'Enter', '1') and returns true when it used it. Ignored with a modifier
 * key held, and while typing in a text field unless allowInInputs is set.
 * Enter and Space on a focused button are left to the button itself.
 * Paused while a dialog (or the shortcuts sheet) is open, unless whenDialogOpen is set,
 * so keys never act on the screen behind it.
 * Set capture to hear keys before text fields do (they stop key events from bubbling).
 * Only the screen in front hears keys: screens lower in the stack stay mounted
 * but are skipped. No-op on iOS and Android.
 */
export function useKeyShortcuts(
  handler: (key: string) => boolean,
  options: { enabled?: boolean; allowInInputs?: boolean; whenDialogOpen?: boolean; capture?: boolean } = {},
): void {
  const { enabled = true, allowInInputs = false, whenDialogOpen = false, capture = false } = options;
  const handlerRef = useRef(handler);
  handlerRef.current = handler;
  // Undefined outside a screen (e.g. app-level shortcuts), which counts as in front.
  const navigation = useContext(NavigationContext);
  const navRef = useRef(navigation);
  navRef.current = navigation;

  useEffect(() => {
    if (Platform.OS !== 'web' || !enabled || typeof window === 'undefined') return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || e.repeat || e.defaultPrevented) return;
      if (!whenDialogOpen && (isShortcutsHelpOpen() || isWebDialogOpen())) return;
      if (navRef.current && !navRef.current.isFocused()) return;
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName;
      const typing = tag === 'INPUT' || tag === 'TEXTAREA' || !!target?.isContentEditable;
      if (typing && !allowInInputs) return;
      if (isContinueKey(e.key) && isPressableTarget(target)) return;
      if (handlerRef.current(e.key)) e.preventDefault();
    };

    window.addEventListener('keydown', onKeyDown, capture);
    return () => window.removeEventListener('keydown', onKeyDown, capture);
  }, [enabled, allowInInputs, whenDialogOpen, capture]);
}
