import { getAllFlags } from '../data';
import { FlagItem, GameQuestion, GameMode } from '../types';
import { shuffleArray } from './gameEngine';
import { twinPairs } from '../data/countryAliases';

/** Modes that support the challenge feature */
export const CHALLENGE_MODES: GameMode[] = [
  'flagpuzzle', 'easy', 'medium', 'hard', 'timeattack', 'neighbors', 'capitalconnection',
];

export interface ChallengeData {
  hostName: string;
  mode: GameMode;
  timeLimit: number;
  flagIds: string[];
  hostResults: { correct: boolean; timeMs: number }[];
}

export type DecodeResult =
  | { status: 'ok'; data: ChallengeData }
  | { status: 'unsupported' }
  | { status: 'invalid' };

// ── V3 ultra-compact format ──
// "FT3-" + urlSafeBase64(name|modeIdx|timeLimit|flagIds|packedResults)
// packedResults: 2-char base36 per flag. 0 = wrong, >0 = correct (deciseconds + 1).
// This merges correctness + timing into one field, no separators needed.

const MODE_INDEX = new Map(CHALLENGE_MODES.map((m, i) => [m, i]));
const INDEX_MODE = new Map(CHALLENGE_MODES.map((m, i) => [i, m]));

/**
 * Encode challenge data into a shareable string.
 * V3: "FT3-" + urlSafeBase64(compact payload). URL-safe, no encoding needed.
 */
export function encodeChallenge(data: ChallengeData): string | null {
  if (data.flagIds.some((id) => id.length !== 2)) {
    return null;
  }
  const modeIdx = MODE_INDEX.get(data.mode);
  if (modeIdx === undefined) {
    return null;
  }
  const flags = data.flagIds.join('');
  // Pack results: 0 = wrong, deciseconds+1 = correct (2 chars base36 each)
  const packed = data.hostResults.map((r) => {
    const val = r.correct ? Math.round(r.timeMs / 100) + 1 : 0;
    return val.toString(36).padStart(2, '0');
  }).join('');
  const payload = `${data.hostName}|${modeIdx}|${data.timeLimit}|${flags}|${packed}`;
  const encoded = toUrlSafeBase64(payload);
  return `FT3-${encoded}`;
}

/**
 * Decode a challenge code string back into ChallengeData.
 * Supports V3 (FT3-), V2 (FT2:), and legacy V1 (FT:) formats.
 */
export function decodeChallenge(code: string): DecodeResult {
  try {
    const trimmed = code.trim();
    if (trimmed.startsWith('FT3-')) {
      const data = decodeV3(trimmed.slice(4));
      return data ? { status: 'ok', data } : { status: 'invalid' };
    }
    if (trimmed.startsWith('FT2:')) {
      const data = decodeV2(trimmed.slice(4));
      return data ? { status: 'ok', data } : { status: 'invalid' };
    }
    if (trimmed.startsWith('FT:')) {
      const data = decodeV1(trimmed.slice(3));
      return data ? { status: 'ok', data } : { status: 'invalid' };
    }
    // Known prefixes handled above. Any other FT prefix is unsupported.
    if (/^FT\d+[-:]/.test(trimmed)) {
      return { status: 'unsupported' };
    }
    return { status: 'invalid' };
  } catch {
    return { status: 'invalid' };
  }
}

function decodeV3(encoded: string): ChallengeData | null {
  const payload = fromUrlSafeBase64(encoded);
  const parts = payload.split('|');
  if (parts.length !== 5) return null;

  const [hostName, modeIdxStr, timeLimitStr, flags, packed] = parts;
  if (!hostName || hostName.length > 50 || flags.length === 0 || flags.length % 2 !== 0) return null;

  const modeIdx = parseInt(modeIdxStr, 10);
  const mode = INDEX_MODE.get(modeIdx);
  if (!mode) return null;

  const timeLimit = parseInt(timeLimitStr, 10);
  if (isNaN(timeLimit)) return null;

  const flagIds: string[] = [];
  for (let i = 0; i < flags.length; i += 2) {
    flagIds.push(flags.slice(i, i + 2));
  }

  // Each result is 2 chars base36. 0 = wrong, >0 = correct (val-1 = deciseconds)
  if (packed.length !== flagIds.length * 2) return null;
  const hostResults = flagIds.map((_, i) => {
    const val = parseInt(packed.slice(i * 2, i * 2 + 2), 36);
    return val === 0
      ? { correct: false, timeMs: 0 }
      : { correct: true, timeMs: (val - 1) * 100 };
  });

  return { hostName, mode, timeLimit, flagIds, hostResults };
}

function decodeV2(encoded: string): ChallengeData | null {
  const payload = fromBase64(encoded);
  const parts = payload.split('|');
  if (parts.length !== 6) return null;

  const [hostName, modeIdxStr, timeLimitStr, flags, bits, timesStr] = parts;
  if (!hostName || hostName.length > 50 || flags.length === 0 || flags.length % 2 !== 0) return null;

  const modeIdx = parseInt(modeIdxStr, 10);
  const mode = INDEX_MODE.get(modeIdx);
  if (!mode) return null;

  const timeLimit = parseInt(timeLimitStr, 10);
  if (isNaN(timeLimit)) return null;

  const flagIds: string[] = [];
  for (let i = 0; i < flags.length; i += 2) {
    flagIds.push(flags.slice(i, i + 2));
  }

  if (bits.length !== flagIds.length) return null;
  const times = timesStr.split(',');
  if (times.length !== flagIds.length) return null;

  const hostResults = flagIds.map((_, i) => ({
    correct: bits[i] === '1',
    timeMs: parseInt(times[i], 10) * 100,
  }));

  return { hostName, mode, timeLimit, flagIds, hostResults };
}

// Legacy V1 decoder for backwards compatibility
interface CompactChallengeV1 {
  n: string;
  m: string;
  t: number;
  f: string[];
  r: [number, number][];
}

function decodeV1(encoded: string): ChallengeData | null {
  const json = fromBase64(encoded);
  const compact: CompactChallengeV1 = JSON.parse(json);

  if (!compact.n || typeof compact.t !== 'number' || !Array.isArray(compact.f) || !Array.isArray(compact.r)) {
    return null;
  }
  if (compact.f.length === 0 || compact.f.length !== compact.r.length) {
    return null;
  }

  const mode = (compact.m || 'flagpuzzle') as GameMode;
  if (!CHALLENGE_MODES.includes(mode)) return null;

  return {
    hostName: compact.n,
    mode,
    timeLimit: compact.t,
    flagIds: compact.f,
    hostResults: compact.r.map(([c, t]) => ({ correct: c === 1, timeMs: t })),
  };
}

/**
 * Build GameQuestion array from challenge flag IDs.
 * For modes with multiple choice, generates options per question.
 */
export function buildChallengeQuestions(flagIds: string[], mode: GameMode): GameQuestion[] | null {
  const allFlags = getAllFlags();
  const flagMap = new Map<string, FlagItem>(allFlags.map((f) => [f.id, f]));

  const questions: GameQuestion[] = [];
  for (const id of flagIds) {
    const flag = flagMap.get(id);
    if (!flag) return null;

    // Generate options for modes that need them
    const needsOptions = mode === 'easy' || mode === 'medium' || mode === 'timeattack';
    let options: string[] = [];
    if (needsOptions) {
      const choiceCount = mode === 'easy' ? 2 : 4;
      const otherFlags = allFlags.filter((f) => f.id !== flag.id);
      const twinNames = twinPairs[flag.name] || [];
      const twinFlags = otherFlags.filter((f) => twinNames.includes(f.name));
      const nonTwinFlags = otherFlags.filter((f) => !twinNames.includes(f.name));
      const wrongCount = choiceCount - 1;
      const selectedTwins = shuffleArray(twinFlags).slice(0, wrongCount);
      const remaining = wrongCount - selectedTwins.length;
      const selectedOthers = shuffleArray(nonTwinFlags).slice(0, remaining);
      const wrongOptions = [...selectedTwins, ...selectedOthers].map((f) => f.name);
      options = shuffleArray([flag.name, ...wrongOptions]);
    }

    questions.push({ flag, options });
  }
  return questions;
}

/** Screen names that support challenge play */
export type ChallengeScreenName = 'Game' | 'FlagPuzzle' | 'Neighbors' | 'CapitalConnection';

/**
 * Get the navigation screen name for a given game mode.
 */
export function getScreenForMode(mode: GameMode): ChallengeScreenName {
  const map: Partial<Record<GameMode, ChallengeScreenName>> = {
    flagpuzzle: 'FlagPuzzle',
    neighbors: 'Neighbors',
    capitalconnection: 'CapitalConnection',
  };
  return map[mode] || 'Game';
}

// ── Short challenge code ──
// Generate a 6-character alphanumeric code from challenge data.
// Used as a human-readable identifier in share messages.
const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no I/O/0/1 to avoid confusion

function simpleHash(str: string): number {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash + str.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

/**
 * Generate a 6-char alphanumeric code from challenge data.
 * Deterministic: same challenge data always produces the same code.
 */
export function generateShortCode(data: ChallengeData): string {
  const seed = `${data.hostName}|${data.mode}|${data.flagIds.join('')}|${data.hostResults.map((r) => r.correct ? '1' : '0').join('')}`;
  let hash = simpleHash(seed);
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += CODE_CHARS[hash % CODE_CHARS.length];
    hash = simpleHash(code + seed.slice(i));
  }
  return code;
}

// ── Base64 helpers (cross-platform) ──

function toBase64(str: string): string {
  if (typeof btoa === 'function') {
    return btoa(unescape(encodeURIComponent(str)));
  }
  return Buffer.from(str, 'utf-8').toString('base64');
}

function fromBase64(encoded: string): string {
  if (typeof atob === 'function') {
    return decodeURIComponent(escape(atob(encoded)));
  }
  return Buffer.from(encoded, 'base64').toString('utf-8');
}

// URL-safe base64: replaces +/ with -_, strips = padding
function toUrlSafeBase64(str: string): string {
  return toBase64(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromUrlSafeBase64(encoded: string): string {
  let b64 = encoded.replace(/-/g, '+').replace(/_/g, '/');
  while (b64.length % 4 !== 0) b64 += '=';
  return fromBase64(b64);
}
