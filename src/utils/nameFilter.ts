/**
 * Lightweight profanity filter for user-entered challenge names.
 * Blocks common English slurs and offensive terms to satisfy
 * Apple's UGC moderation requirements.
 *
 * The check normalises input (lowercase, strips repeated chars and
 * common letter substitutions) then tests against a blocklist.
 */

const BLOCKED: readonly string[] = [
  'ass', 'asshole', 'bastard', 'bitch', 'blowjob', 'cock', 'cunt',
  'damn', 'dick', 'dildo', 'dyke', 'fag', 'faggot', 'fuck', 'goddamn',
  'homo', 'jerkoff', 'kike', 'motherfuck', 'nazi', 'nigga', 'nigger',
  'penis', 'piss', 'pussy', 'rape', 'retard', 'shit', 'slut', 'spic',
  'tits', 'twat', 'vagina', 'whore', 'wank',
];

/** Normalise text: lowercase, collapse repeated letters, replace common leet-speak. */
function normalise(text: string): string {
  let s = text.toLowerCase().trim();
  // Common substitutions
  s = s.replace(/0/g, 'o');
  s = s.replace(/1/g, 'i');
  s = s.replace(/3/g, 'e');
  s = s.replace(/4/g, 'a');
  s = s.replace(/5/g, 's');
  s = s.replace(/\$/g, 's');
  s = s.replace(/@/g, 'a');
  // Strip non-alpha (spaces, hyphens, underscores, symbols)
  s = s.replace(/[^a-z]/g, '');
  // Collapse repeated chars (e.g. "fuuuck" -> "fuck")
  s = s.replace(/(.)\1{2,}/g, '$1$1');
  return s;
}

/** Returns true if the name contains blocked content. */
export function isNameBlocked(name: string): boolean {
  const norm = normalise(name);
  if (norm.length === 0) return false;
  return BLOCKED.some((word) => norm.includes(word));
}
