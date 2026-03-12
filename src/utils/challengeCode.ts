import { getAllFlags } from '../data';
import { FlagItem, GameQuestion, GameMode } from '../types';
import { shuffleArray, modeLabelKey } from './gameEngine';
import { twinPairs } from '../data/countryAliases';
import { APP_DOMAIN, MAX_CHALLENGE_FLAGS, MAX_CHALLENGE_NAME_LENGTH, MAX_HOSTNAME_LENGTH, SHORT_CODE_LENGTH, SPEED_FAST_MS, SPEED_MEDIUM_MS, SHARE_GRID_ROW_SIZE, EASY_CHOICE_COUNT, STANDARD_CHOICE_COUNT } from './config';
import { t } from './i18n';

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
  difficulty?: 'easy' | 'medium' | 'hard';
}

export type DecodeResult =
  | { status: 'ok'; data: ChallengeData }
  | { status: 'unsupported' }
  | { status: 'invalid' };

// ── V3 raw URL-safe format (no base64) ──
// name~modeIdx~timeLimit~flagIds~correctHex~totalDeci
// correctHex: correct/wrong bits packed as hex (e.g. "2d6" for 1011010110)
// totalDeci: total answer time in deciseconds (single number)

const MODE_INDEX = new Map(CHALLENGE_MODES.map((m, i) => [m, i]));
const INDEX_MODE = new Map(CHALLENGE_MODES.map((m, i) => [i, m]));

/** Sanitize name for URL: keep alphanumeric + underscore, replace spaces */
function sanitizeName(name: string): string {
  return name.replace(/\s+/g, '_').replace(/[^A-Za-z0-9_]/g, '').slice(0, MAX_CHALLENGE_NAME_LENGTH) || 'Player';
}

/**
 * Encode challenge data into a URL-safe string.
 * No base64 - the output goes directly into the URL path.
 */
export function encodeChallenge(data: ChallengeData): string | null {
  if (data.flagIds.length > MAX_CHALLENGE_FLAGS) return null; // bit-packing limit
  if (data.hostResults.length !== data.flagIds.length) return null;
  if (data.flagIds.some((id) => id.length !== 2)) return null;
  const modeIdx = MODE_INDEX.get(data.mode);
  if (modeIdx === undefined) return null;

  const name = sanitizeName(data.hostName);
  const flags = data.flagIds.join('');
  // Pack correct/wrong bits as unsigned hex (>>> 0 prevents signed int issues)
  let bits = 0;
  for (const r of data.hostResults) {
    bits = (bits << 1) | (r.correct ? 1 : 0);
  }
  const correctHex = (bits >>> 0).toString(16);
  const totalDeci = Math.round(data.hostResults.reduce((s, r) => s + r.timeMs, 0) / 100);

  const base = `${name}~${modeIdx}~${data.timeLimit}~${flags}~${correctHex}~${totalDeci}`;
  if (data.difficulty) {
    const diffIdx = data.difficulty === 'easy' ? 0 : data.difficulty === 'hard' ? 2 : 1;
    return `${base}~${diffIdx}`;
  }
  return base;
}

/** Strip URL prefixes so users can paste full URLs into the code input */
function stripUrlPrefix(input: string): string {
  const escaped = APP_DOMAIN.replace(/\./g, '\\.');
  return input
    .replace(new RegExp(`^https?://${escaped}/c/`, 'i'), '')
    .replace(new RegExp(`^${escaped}/c/`, 'i'), '')
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
  if (parts.length < 6 || parts.length > 7) return null;

  const [hostName, modeIdxStr, timeLimitStr, flags, correctHex, totalDeciStr, diffIdxStr] = parts;
  if (!hostName || hostName.length > MAX_HOSTNAME_LENGTH || flags.length === 0 || flags.length % 2 !== 0 || flags.length > MAX_CHALLENGE_FLAGS * 2) return null;

  const modeIdx = parseInt(modeIdxStr, 10);
  const mode = INDEX_MODE.get(modeIdx);
  if (!mode) return null;

  const timeLimit = parseInt(timeLimitStr, 10);
  if (isNaN(timeLimit)) return null;

  const flagIds: string[] = [];
  for (let i = 0; i < flags.length; i += 2) {
    flagIds.push(flags.slice(i, i + 2));
  }

  const rawBits = parseInt(correctHex, 16);
  if (isNaN(rawBits)) return null;
  const bits = rawBits >>> 0; // unsigned
  const totalDeci = parseInt(totalDeciStr, 10);
  if (isNaN(totalDeci)) return null;

  const n = flagIds.length;
  const correctCount = flagIds.filter((_, i) => (bits >>> (n - 1 - i)) & 1).length;
  const avgTimeMs = correctCount > 0 ? Math.round((totalDeci * 100) / correctCount) : 0;

  const hostResults = flagIds.map((_, i) => {
    const correct = !!((bits >>> (n - 1 - i)) & 1);
    return { correct, timeMs: correct ? avgTimeMs : 0 };
  });

  const diffMap: Record<number, 'easy' | 'medium' | 'hard'> = { 0: 'easy', 1: 'medium', 2: 'hard' };
  const difficulty = diffIdxStr !== undefined ? diffMap[parseInt(diffIdxStr, 10)] : undefined;

  return { hostName, mode, timeLimit, flagIds, hostResults, ...(difficulty && { difficulty }) };
}

// Transitional: decode FT3- base64 codes from earlier builds
function decodeV3Base64(encoded: string): ChallengeData | null {
  const payload = fromUrlSafeBase64(encoded);
  const parts = payload.split('|');
  if (parts.length !== 5) return null;

  const [hostName, modeIdxStr, timeLimitStr, flags, packed] = parts;
  if (!hostName || hostName.length > MAX_HOSTNAME_LENGTH || flags.length === 0 || flags.length % 2 !== 0) return null;

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
  if (!hostName || hostName.length > MAX_HOSTNAME_LENGTH || flags.length === 0 || flags.length % 2 !== 0) return null;

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
export function buildChallengeQuestions(flagIds: string[], mode: GameMode, difficulty?: 'easy' | 'medium' | 'hard'): GameQuestion[] | null {
  const allFlags = getAllFlags();
  const flagMap = new Map<string, FlagItem>(allFlags.map((f) => [f.id, f]));
  const effectiveDifficulty = difficulty || (mode === 'easy' ? 'easy' : mode === 'hard' ? 'hard' : 'medium');

  const questions: GameQuestion[] = [];
  for (const id of flagIds) {
    const flag = flagMap.get(id);
    if (!flag) return null;

    const isHardMode = effectiveDifficulty === 'hard';
    const needsOptions = !isHardMode && (mode === 'easy' || mode === 'medium' || mode === 'timeattack');
    let options: string[] = [];
    if (needsOptions) {
      const choiceCount = effectiveDifficulty === 'easy' ? EASY_CHOICE_COUNT : STANDARD_CHOICE_COUNT;
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
  for (let i = 0; i < SHORT_CODE_LENGTH; i++) {
    code += CODE_CHARS[hash % CODE_CHARS.length];
    hash = simpleHash(code + seed.slice(i));
  }
  return code;
}

/**
 * Generate a Wordle-style challenge share card.
 * Shows a visual grid of results with speed indicators,
 * the host's score, and a deep link to play.
 */
export function generateChallengeShareCard(
  results: { correct: boolean; timeMs: number }[],
  hostName: string,
  mode: GameMode,
  challengeUrl: string,
): string {
  const correct = results.filter((r) => r.correct).length;
  const total = results.length;

  // Build visual grid: correct with speed tiers, wrong = red
  // Fast (<2s) = gold, Medium (<5s) = green, Slow (5s+) = white, Wrong = red
  const grid = results.map((r) => {
    if (!r.correct) return '\uD83D\uDFE5'; // red square
    if (r.timeMs < SPEED_FAST_MS) return '\uD83D\uDFE8'; // yellow square (lightning fast)
    if (r.timeMs < SPEED_MEDIUM_MS) return '\uD83D\uDFE9'; // green square (solid)
    return '\u2B1C'; // white square (slow but correct)
  });

  // Split into rows of 5
  const rows: string[] = [];
  for (let i = 0; i < grid.length; i += SHARE_GRID_ROW_SIZE) {
    rows.push(grid.slice(i, i + SHARE_GRID_ROW_SIZE).join(''));
  }
  const gridStr = rows.join('\n');

  const avgTime = results.length > 0
    ? Math.round(results.reduce((s, r) => s + r.timeMs, 0) / results.length / 100) / 10
    : 0;

  const modeLabel = t(modeLabelKey(mode));
  const header = t('challenge.shareCardHeader', { mode: modeLabel, correct, total });
  const avg = t('challenge.shareCardAvg', { time: avgTime });
  const cta = t('challenge.shareCardCta', { name: hostName });

  return `${header}\n${avg}\n\n${gridStr}\n\n${cta}\n${challengeUrl}`;
}

// ── Response code: recipient sends results back to challenger ──

export interface ChallengeResponseData {
  recipientName: string;
  shortCode: string;
  recipientScore: number;
  totalFlags: number;
  /** Per-question correct/wrong results (true = correct). Optional for backward compat with old codes. */
  resultDetails?: boolean[];
}

/**
 * Encode a challenge response into a URL-safe string.
 * Format: R~recipientName~shortCode~score~totalFlags[~correctHex]
 * The R~ prefix distinguishes response codes from challenge codes.
 * correctHex (optional): per-question correct/wrong bits packed as hex.
 */
export function encodeResponse(data: ChallengeResponseData): string {
  const name = sanitizeName(data.recipientName);
  const base = `R~${name}~${data.shortCode}~${data.recipientScore}~${data.totalFlags}`;
  if (data.resultDetails && data.resultDetails.length > 0 && data.resultDetails.length === data.totalFlags) {
    let bits = 0;
    for (const correct of data.resultDetails) {
      bits = (bits << 1) | (correct ? 1 : 0);
    }
    return `${base}~${(bits >>> 0).toString(16)}`;
  }
  return base;
}

export type DecodeResponseResult =
  | { status: 'ok'; data: ChallengeResponseData }
  | { status: 'invalid' };

/** Strip URL prefixes from a response code so users can paste full URLs */
function stripResponseUrlPrefix(input: string): string {
  const escaped = APP_DOMAIN.replace(/\./g, '\\.');
  return input
    .replace(new RegExp(`^https?://${escaped}/r/`, 'i'), '')
    .replace(new RegExp(`^${escaped}/r/`, 'i'), '')
    .replace(/^flagthat:\/\/r\//i, '');
}

/**
 * Decode a challenge response code string.
 * Handles full URLs pasted by the user.
 */
export function decodeResponse(code: string): DecodeResponseResult {
  try {
    const trimmed = stripResponseUrlPrefix(code.trim());
    if (!trimmed.startsWith('R~')) return { status: 'invalid' };

    const parts = trimmed.slice(2).split('~'); // strip R~ prefix
    if (parts.length !== 4 && parts.length !== 5) return { status: 'invalid' };

    const [recipientName, shortCode, scoreStr, totalStr, bitsHex] = parts;
    if (!recipientName || !shortCode || shortCode.length !== SHORT_CODE_LENGTH) return { status: 'invalid' };

    const recipientScore = parseInt(scoreStr, 10);
    const totalFlags = parseInt(totalStr, 10);
    if (isNaN(recipientScore) || isNaN(totalFlags) || recipientScore < 0 || totalFlags <= 0) return { status: 'invalid' };

    let resultDetails: boolean[] | undefined;
    if (bitsHex) {
      const rawBits = parseInt(bitsHex, 16);
      if (!isNaN(rawBits)) {
        const bits = rawBits >>> 0;
        resultDetails = [];
        for (let i = totalFlags - 1; i >= 0; i--) {
          resultDetails.push(!!((bits >>> i) & 1));
        }
      }
    }

    return { status: 'ok', data: { recipientName, shortCode, recipientScore, totalFlags, resultDetails } };
  } catch {
    return { status: 'invalid' };
  }
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
