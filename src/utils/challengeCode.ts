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

// ── V3 raw URL-safe format (no base64) ──
// name~modeIdx~timeLimit~flagIds~packedResults
// All chars are URL-safe, zero encoding overhead.
// packedResults: 2-char base36 per flag (0=wrong, >0 = deciseconds+1).

const MODE_INDEX = new Map(CHALLENGE_MODES.map((m, i) => [m, i]));
const INDEX_MODE = new Map(CHALLENGE_MODES.map((m, i) => [i, m]));

/** Sanitize name for URL: keep alphanumeric + underscore, replace spaces */
function sanitizeName(name: string): string {
  return name.replace(/\s+/g, '_').replace(/[^A-Za-z0-9_]/g, '').slice(0, 15) || 'Player';
}

/**
 * Encode challenge data into a URL-safe string.
 * No base64 - the output goes directly into the URL path.
 */
export function encodeChallenge(data: ChallengeData): string | null {
  if (data.flagIds.some((id) => id.length !== 2)) return null;
  const modeIdx = MODE_INDEX.get(data.mode);
  if (modeIdx === undefined) return null;

  const name = sanitizeName(data.hostName);
  const flags = data.flagIds.join('');
  const packed = data.hostResults.map((r) => {
    const val = r.correct ? Math.round(r.timeMs / 100) + 1 : 0;
    return val.toString(36).padStart(2, '0');
  }).join('');

  return `${name}~${modeIdx}~${data.timeLimit}~${flags}~${packed}`;
}

/** Strip URL prefixes so users can paste full URLs into the code input */
function stripUrlPrefix(input: string): string {
  return input
    .replace(/^https?:\/\/flagthat\.app\/c\//i, '')
    .replace(/^flagthat\.app\/c\//i, '')
    .replace(/^flagthat:\/\/c\//i, '');
}

/**
 * Decode a challenge code string back into ChallengeData.
 * Supports V3 raw (~-separated), V2 (FT2:base64), and V1 (FT:base64).
 * Also handles full URLs pasted into the input field.
 */
export function decodeChallenge(code: string): DecodeResult {
  try {
    const trimmed = stripUrlPrefix(code.trim());
    // V3 raw format: contains ~ separators
    if (trimmed.includes('~')) {
      const data = decodeV3Raw(trimmed);
      return data ? { status: 'ok', data } : { status: 'invalid' };
    }
    // V3 base64 (transitional, from earlier builds)
    if (trimmed.startsWith('FT3-')) {
      const data = decodeV3Base64(trimmed.slice(4));
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
    if (/^FT\d+[-:]/.test(trimmed)) {
      return { status: 'unsupported' };
    }
    return { status: 'invalid' };
  } catch {
    return { status: 'invalid' };
  }
}

function decodeV3Raw(raw: string): ChallengeData | null {
  const parts = raw.split('~');
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

  if (packed.length !== flagIds.length * 2) return null;
  const hostResults = flagIds.map((_, i) => {
    const val = parseInt(packed.slice(i * 2, i * 2 + 2), 36);
    return val === 0
      ? { correct: false, timeMs: 0 }
      : { correct: true, timeMs: (val - 1) * 100 };
  });

  return { hostName, mode, timeLimit, flagIds, hostResults };
}

// Transitional: decode FT3- base64 codes from earlier builds
function decodeV3Base64(encoded: string): ChallengeData | null {
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

// Legacy V1 decoder
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

export function getScreenForMode(mode: GameMode): ChallengeScreenName {
  const map: Partial<Record<GameMode, ChallengeScreenName>> = {
    flagpuzzle: 'FlagPuzzle',
    neighbors: 'Neighbors',
    capitalconnection: 'CapitalConnection',
  };
  return map[mode] || 'Game';
}

// ── Short challenge code ──
const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function simpleHash(str: string): number {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash + str.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

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

// ── Base64 helpers (for legacy V1/V2 decoding only) ──

function fromBase64(encoded: string): string {
  if (typeof atob === 'function') {
    return decodeURIComponent(escape(atob(encoded)));
  }
  return Buffer.from(encoded, 'base64').toString('utf-8');
}

function fromUrlSafeBase64(encoded: string): string {
  let b64 = encoded.replace(/-/g, '+').replace(/_/g, '/');
  while (b64.length % 4 !== 0) b64 += '=';
  return fromBase64(b64);
}
