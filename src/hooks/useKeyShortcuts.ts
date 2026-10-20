import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';

/**
 * Keyboard shortcuts for the web build. The handler gets each key press
 * (e.g. 'Enter', '1') and returns true when it used it. Ignored with a modifier
 * key held, and while typing in a text field unless allowInInputs is set.
 * No-op on iOS and Android.
 */
export function useKeyShortcuts(
  handler: (key: string) => boolean,
  options: { enabled?: boolean; allowInInputs?: boolean } = {},
): void {
  const { enabled = true, allowInInputs = false } = options;
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  useEffect(() => {
    if (Platform.OS !== 'web' || !enabled || typeof window === 'undefined') return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || e.repeat) return;
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName;
      const typing = tag === 'INPUT' || tag === 'TEXTAREA' || !!target?.isContentEditable;
      if (typing && !allowInInputs) return;
      if (handlerRef.current(e.key)) e.preventDefault();
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [enabled, allowInInputs]);
}
