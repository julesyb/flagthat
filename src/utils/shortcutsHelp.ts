/**
 * Open state for the keyboard shortcuts sheet. A tiny store so the '?' key,
 * the Settings row, and the sheet itself share one source of truth.
 */
type Listener = (open: boolean) => void;

let open = false;
const listeners = new Set<Listener>();

export function isShortcutsHelpOpen(): boolean {
  return open;
}

export function setShortcutsHelpOpen(next: boolean): void {
  if (open === next) return;
  open = next;
  listeners.forEach((l) => l(open));
}

export function subscribeShortcutsHelp(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
