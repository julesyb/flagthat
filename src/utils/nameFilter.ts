/**
 * Lightweight profanity filter for user-entered challenge names.
 *
 * Uses whole-word matching for short words to avoid false positives
 * on legitimate names (class, bass, Hancock, etc.).
 */

/** Words blocked as exact whole tokens only (avoids false positives on substrings). */
const BLOCKED_EXACT: readonly string[] = [
  'ass', 'cock', 'cum', 'cunt', 'damn', 'dyke',
  'fag', 'homo', 'piss', 'prick', 'shit', 'slut', 'tits',
  'twat', 'wank', 'whore',
];

/** Longer slurs blocked via substring (safe from false positives at this length). */
const BLOCKED_SUBSTRING: readonly string[] = [
  'asshole', 'bastard', 'bitch', 'blowjob', 'dickhead', 'dildo', 'douche',
  'faggot', 'fuck', 'goddamn', 'jerkoff', 'kike', 'motherfuck',
  'nazi', 'nigga', 'nigger', 'pussy', 'rape', 'retard',
  'spic',
];

/** Normalise text: lowercase, replace common leet-speak. */
function normalise(text: string): string {
  let s = text.toLowerCase().trim();
  s = s.replace(/0/g, 'o');
  s = s.replace(/1/g, 'i');
  s = s.replace(/3/g, 'e');
  s = s.replace(/4/g, 'a');
  s = s.replace(/5/g, 's');
  s = s.replace(/\$/g, 's');
  s = s.replace(/@/g, 'a');
  return s;
}

/** Collapse runs of 3+ repeated chars to 2 (preserves legitimate doubles like "ss"). */
function collapseExcess(text: string): string {
  return text.replace(/(.)\1{2,}/g, '$1$1');
}

/** Collapse all runs of repeated chars to a single char. */
function dedup(text: string): string {
  return text.replace(/(.)\1+/g, '$1');
}

/** Split into alpha-only tokens. */
function tokenise(text: string): string[] {
  return text.split(/[^a-z]+/).filter(Boolean);
}

/** Check a stripped string against both blocklists. */
function matchesBlocklist(stripped: string, tokens: string[]): boolean {
  if (BLOCKED_SUBSTRING.some((w) => stripped.includes(w))) return true;
  if (tokens.some((t) => BLOCKED_EXACT.includes(t))) return true;
  if (BLOCKED_EXACT.includes(stripped)) return true;
  return false;
}

/** Returns true if the name contains blocked content. */
export function isNameBlocked(name: string): boolean {
  const norm = normalise(name);
  if (norm.length === 0) return false;

  const stripped = norm.replace(/[^a-z]/g, '');
  if (stripped.length === 0) return false;

  const tokens = tokenise(norm);

  // Check as-is (handles "asshole", "fuck", etc.)
  if (matchesBlocklist(stripped, tokens)) return true;

  // Check with 3+ repeated chars collapsed to 2 (handles "asssshole" → "asshole")
  const collapsedStripped = collapseExcess(stripped);
  const collapsedTokens = tokens.map(collapseExcess);
  if (matchesBlocklist(collapsedStripped, collapsedTokens)) return true;

  // Check with all doubles collapsed to 1 (handles "fuuuck" → "fuck", "shiiit" → "shit")
  const dedupStripped = dedup(stripped);
  const dedupTokens = tokens.map(dedup);
  if (matchesBlocklist(dedupStripped, dedupTokens)) return true;

  return false;
}
