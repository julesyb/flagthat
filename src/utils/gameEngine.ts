import { GameMode, FlagItem, GameQuestion, GameResult, GameConfig } from '../types';
import { getFlagsForCategory, getAllFlags } from '../data';
import { countryAliases, twinPairs } from '../data/countryAliases';
import { translateName } from '../data/countryNames';
import { countryCapitals } from '../data/countryCapitals';
import { APP_DOMAIN, DAILY_QUESTION_COUNT, SHARE_GRID_ROW_SIZE, EASY_CHOICE_COUNT, STANDARD_CHOICE_COUNT } from './config';
import {
  getFlagLastShownSync,
  getFlagStatsSync,
  FlagLastShown,
  FlagStats,
  MASTERED_STREAK,
} from './storage';
import { t } from './i18n';

/** Maps a GameMode to its display-label i18n key. Quiz difficulty modes (easy/medium/hard) all display as "Quiz". */
export function modeLabelKey(mode: GameMode): string {
  if (mode === 'easy' || mode === 'medium' || mode === 'hard') return 'modes.quiz';
  return `modes.${mode}`;
}

export function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/**
 * Rotates a pool of items so that the least-recently-shown items come first.
 * Ties (including flags that have never been shown) are randomized via a prior shuffle.
 * Relies on Array.prototype.sort being stable (ES2019+), which all supported engines honor.
 *
 * This is the mechanism that enforces "no repeats until you've seen everything else":
 * callers select the first N items from the result, so a flag that was just shown
 * cannot reappear until every other flag in the pool has been shown at least as recently.
 *
 * `getId` extracts the flag id for each item so callers can pass either FlagItem
 * objects or bare id strings (as Neighbors does with its eligible country-code list).
 */
export function rotateByLeastRecentlyShown<T>(
  items: T[],
  getId: (item: T) => string,
  lastShown?: FlagLastShown,
): T[] {
  const map = lastShown ?? getFlagLastShownSync();
  const shuffled = shuffleArray(items);
  return shuffled.sort((a, b) => (map[getId(a)] ?? 0) - (map[getId(b)] ?? 0));
}

// ── Spaced-repetition: two-lane selection ──────────────────────────────
//
// Two competing goals:
//   1. "Go through the whole list before anything repeats" — hard cycle.
//   2. "If I got Mozambique wrong, show it again soon" — spaced repetition.
//
// A single sorted queue can't do both. If you get one wrong it goes to
// the back of the rotation queue — you won't see it again for 200 flags.
// That kills learning.
//
// Solution: two lanes.
//
//   ROTATION LANE (hard cycle guarantee):
//     Sort pool by lastShown ascending (ties randomized). Take exactly
//     the N stalest flags. Everything else is hard-excluded. Shuffle
//     the slice so in-game ordering stays unpredictable.
//
//   URGENT LANE (spaced repetition override):
//     Reserve up to ~20% of question slots (min 1, max 2) for flags the
//     user is actively struggling with (rightStreak === 0, wrong > 0),
//     regardless of when they were last shown. These bypass the cycle.
//     Capped so it can't dominate and feel like "the same flags again."

const WEIGHT_MASTERED = 0.4;
const WEIGHT_NEUTRAL = 1;
const WEIGHT_STRUGGLING = 2.5;

/** How much of the game to reserve for urgent misses (20%, min 1, max 2). */
function urgentSlotCount(totalCount: number): number {
  if (totalCount <= 2) return 0; // don't take over tiny games
  return Math.min(2, Math.max(1, Math.floor(totalCount * 0.2)));
}

export function flagLearningWeight(id: string, stats?: FlagStats): number {
  const map = stats ?? getFlagStatsSync();
  const s = map[id];
  if (!s) return WEIGHT_NEUTRAL;
  if (s.rightStreak >= MASTERED_STREAK) return WEIGHT_MASTERED;
  if (s.rightStreak === 0 && s.wrong > 0) return WEIGHT_STRUGGLING;
  return WEIGHT_NEUTRAL;
}

/**
 * Weighted sampling without replacement via Efraimidis-Spirakis reservoir
 * keys: draw U ~ Uniform(0,1) for each item, compute key = -ln(U) / weight,
 * keep the `count` items with the smallest keys.
 */
export function weightedSampleWithoutReplacement<T>(
  items: T[],
  getWeight: (item: T) => number,
  count: number,
): T[] {
  if (count <= 0 || items.length === 0) return [];
  if (count >= items.length) return shuffleArray(items);
  const keyed = items.map((item) => {
    const w = Math.max(getWeight(item), 1e-6);
    const u = Math.random() || 1e-12;
    return { item, key: -Math.log(u) / w };
  });
  keyed.sort((a, b) => a.key - b.key);
  return keyed.slice(0, count).map((x) => x.item);
}

/**
 * The main selection primitive used by every non-deterministic game mode.
 *
 * Guarantees:
 *   • Hard cycle: a flag cannot appear in the rotation lane until every
 *     other flag in the pool has been shown first.
 *   • Spaced repetition: flags the user is struggling with can re-surface
 *     within 1-2 games via the urgent lane, even if they were just shown.
 *   • Non-determinism: ties in lastShown are randomized, the urgent lane
 *     uses weighted sampling, and the final result is shuffled.
 */
export function selectFlagsForGame<T>(
  pool: T[],
  count: number,
  getId: (item: T) => string,
  opts?: { lastShown?: FlagLastShown; flagStats?: FlagStats },
): T[] {
  if (pool.length === 0 || count <= 0) return [];
  const actualCount = Math.min(count, pool.length);
  const lastShown = opts?.lastShown ?? getFlagLastShownSync();
  const flagStats = opts?.flagStats ?? getFlagStatsSync();

  // ── Urgent lane: pull struggling flags that bypass the cycle ──
  const maxUrgent = urgentSlotCount(actualCount);
  let urgentPicks: T[] = [];
  const urgentSet = new Set<string>();

  if (maxUrgent > 0) {
    // Struggling = last answer was wrong and they haven't recovered.
    // Sort by most-wrong-first so the hardest flags get priority.
    const struggling = pool
      .filter((item) => {
        const s = flagStats[getId(item)];
        return s && s.rightStreak === 0 && s.wrong > 0;
      })
      .sort((a, b) => (flagStats[getId(b)]?.wrong ?? 0) - (flagStats[getId(a)]?.wrong ?? 0));

    if (struggling.length > 0) {
      // Weighted sample (not strict top-N) so it stays unpredictable.
      urgentPicks = weightedSampleWithoutReplacement(
        struggling,
        (item) => flagStats[getId(item)]?.wrong ?? 1,
        Math.min(maxUrgent, struggling.length),
      );
      for (const item of urgentPicks) urgentSet.add(getId(item));
    }
  }

  // ── Rotation lane: hard cycle for the remaining slots ──
  const rotationCount = actualCount - urgentPicks.length;
  const rotationPool = pool.filter((item) => !urgentSet.has(getId(item)));
  const rotated = rotateByLeastRecentlyShown(rotationPool, getId, lastShown);

  // Hard cycle: take exactly rotationCount from the front of the rotation.
  // These are the stalest flags, and everything behind them is excluded.
  // Shuffle the slice so in-game ordering stays unpredictable.
  const rotationPicks = shuffleArray(rotated.slice(0, rotationCount));

  // ── Combine and shuffle so urgent flags don't cluster at the start ──
  return shuffleArray([...urgentPicks, ...rotationPicks]);
}

// Seeded PRNG (mulberry32) - deterministic shuffle for daily challenge
function seededRandom(seed: number): () => number {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function seededShuffle<T>(array: T[], seed: number): T[] {
  const shuffled = [...array];
  const rng = seededRandom(seed);
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

// Returns a numeric seed from a date string like "2026-03-11"
function dateSeed(dateStr: string): number {
  let hash = 0;
  for (let i = 0; i < dateStr.length; i++) {
    hash = ((hash << 5) - hash + dateStr.charCodeAt(i)) | 0;
  }
  return hash;
}

export function getTodayDateString(): string {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

// Daily challenge mode variants — deterministic per day.
// Each day rotates through difficulty, display mode, and game type combinations.
// Excludes neighbors and flash flag for daily challenges.
export type DailyGameType = 'quiz' | 'flagpuzzle' | 'capitalconnection';

export type DailyVariant = {
  gameType: DailyGameType;
  difficulty: 'easy' | 'medium' | 'hard';
  displayMode: 'flag' | 'map';
};

const DAILY_VARIANTS: DailyVariant[] = [
  { gameType: 'quiz', difficulty: 'easy', displayMode: 'flag' },
  { gameType: 'quiz', difficulty: 'medium', displayMode: 'flag' },
  { gameType: 'quiz', difficulty: 'hard', displayMode: 'flag' },
  { gameType: 'quiz', difficulty: 'easy', displayMode: 'map' },
  { gameType: 'quiz', difficulty: 'medium', displayMode: 'map' },
  { gameType: 'quiz', difficulty: 'hard', displayMode: 'map' },
  { gameType: 'flagpuzzle', difficulty: 'medium', displayMode: 'flag' },
  { gameType: 'flagpuzzle', difficulty: 'hard', displayMode: 'flag' },
  { gameType: 'capitalconnection', difficulty: 'easy', displayMode: 'flag' },
  { gameType: 'capitalconnection', difficulty: 'medium', displayMode: 'flag' },
  { gameType: 'capitalconnection', difficulty: 'hard', displayMode: 'flag' },
  { gameType: 'capitalconnection', difficulty: 'easy', displayMode: 'map' },
];

/** Get the daily challenge variant for a given date. Deterministic per day. */
export function getDailyVariant(dateStr?: string): DailyVariant {
  const date = dateStr || getTodayDateString();
  const seed = dateSeed(date);
  // Use absolute value and mod to pick a variant
  const idx = Math.abs(seed) % DAILY_VARIANTS.length;
  return DAILY_VARIANTS[idx];
}

/** Build the GameConfig for today's daily challenge. */
export function getDailyConfig(dateStr?: string): GameConfig {
  const date = dateStr || getTodayDateString();
  const variant = getDailyVariant(date);
  const config: GameConfig = {
    mode: 'daily',
    category: 'all',
    questionCount: DAILY_QUESTION_COUNT,
    displayMode: variant.displayMode,
    difficulty: variant.difficulty,
  };

  // For flagpuzzle/capitalconnection, pre-generate deterministic flag IDs
  // so every player gets the same flags on the same day.
  if (variant.gameType !== 'quiz') {
    const seed = dateSeed(date);
    let pool = getAllFlags();
    // Capital connection needs flags with known capitals
    if (variant.gameType === 'capitalconnection') {
      pool = pool.filter((f) => countryCapitals[f.id]);
    }
    const shuffled = seededShuffle(pool, seed);
    config.dailyFlagIds = shuffled.slice(0, DAILY_QUESTION_COUNT).map((f) => f.id);
    if (variant.gameType === 'flagpuzzle') {
      config.timeLimit = 15;
    }
  }

  return config;
}

export function generateDailyQuestions(dateStr?: string): GameQuestion[] {
  const date = dateStr || getTodayDateString();
  const seed = dateSeed(date);
  const variant = getDailyVariant(date);
  const allFlags = getAllFlags();
  const shuffled = seededShuffle(allFlags, seed);
  const selected = shuffled.slice(0, DAILY_QUESTION_COUNT);

  const optionSeed = seed + 1000;

  // Hard mode: no options (user types answer)
  if (variant.difficulty === 'hard') {
    return selected.map((flag) => ({ flag, options: [] }));
  }

  const choiceCount = variant.difficulty === 'easy' ? EASY_CHOICE_COUNT : STANDARD_CHOICE_COUNT;

  return selected.map((flag, qi) => {
    const otherFlags = allFlags.filter((f) => f.id !== flag.id);
    const twinNames = twinPairs[flag.name] || [];
    const twins = otherFlags.filter((f) => twinNames.includes(f.name));
    const nonTwins = otherFlags.filter((f) => !twinNames.includes(f.name));

    // Pick wrong answers, prioritizing twins (Fisher-Yates via seededShuffle)
    const wrongCount = choiceCount - 1;
    const shuffledTwins = seededShuffle(twins, optionSeed + qi * 3);
    const selectedTwins = shuffledTwins.slice(0, wrongCount);
    const remaining = wrongCount - selectedTwins.length;
    const shuffledOthers = seededShuffle(nonTwins, optionSeed + qi * 3 + 1);
    const selectedOthers = shuffledOthers.slice(0, remaining);

    const wrongOptions = [...selectedTwins, ...selectedOthers].map((f) => f.name);
    const allOptions = [flag.name, ...wrongOptions];
    // Deterministic shuffle of options (Fisher-Yates)
    const options = seededShuffle(allOptions, optionSeed + qi * 3 + 2);

    return { flag, options };
  });
}

export function generateDailyShareGrid(results: GameResult[]): string {
  const correct = results.filter((r) => r.correct).length;
  const grid = results.map((r) => (r.correct ? '\u2b1b' : '\u2b1c')).join('');
  // Split into rows of 5
  const row1 = grid.slice(0, SHARE_GRID_ROW_SIZE);
  const row2 = grid.slice(SHARE_GRID_ROW_SIZE, DAILY_QUESTION_COUNT);
  return `${t('results.shareTitle')}\n${t('results.shareScore', { correct })}\n\n${row1}\n${row2}`;
}

export function generateShareGrid(results: GameResult[], modeLabel: string): string {
  const correct = results.filter((r) => r.correct).length;
  const accuracy = calculateAccuracy(results);
  const grid = results.map((r) => (r.correct ? '\u2b1b' : '\u2b1c')).join('');
  // Split into rows of 5
  const rows: string[] = [];
  for (let i = 0; i < grid.length; i += SHARE_GRID_ROW_SIZE) {
    rows.push(grid.slice(i, i + SHARE_GRID_ROW_SIZE));
  }
  const gridStr = rows.join('\n');
  const perfectLine = accuracy === 100 ? `\n${t('results.perfectShareNote')}` : '';
  return `Flag That - ${modeLabel}\n${correct}/${results.length} (${accuracy}%)${perfectLine}\n\n${gridStr}\n\n${APP_DOMAIN}`;
}

export function generateQuestions(config: GameConfig): GameQuestion[] {
  const categoryFlags = getFlagsForCategory(config.category);

  if (categoryFlags.length === 0) return [];

  let selectedFlags: FlagItem[];
  if (config.dailyFlagIds) {
    // Daily variants with pre-selected flags (flagpuzzle, capitalconnection)
    const flagMap = new Map(categoryFlags.map((f) => [f.id, f]));
    selectedFlags = config.dailyFlagIds
      .map((id) => flagMap.get(id))
      .filter((f): f is FlagItem => f !== undefined);
  } else {
    selectedFlags = selectFlagsForGame(
      categoryFlags,
      config.questionCount,
      (f) => f.id,
    );
  }

  return selectedFlags.map((flag) => {
    const options = generateOptions(flag, categoryFlags, config.mode, config.difficulty);
    return { flag, options };
  });
}

export function generatePracticeQuestions(flagIds: string[]): GameQuestion[] {
  const allFlags = getAllFlags();
  const flagMap = new Map(allFlags.map((f) => [f.id, f]));
  const practiceFlags = flagIds
    .map((id) => flagMap.get(id))
    .filter((f): f is FlagItem => f !== undefined);

  if (practiceFlags.length === 0) return [];

  const shuffled = shuffleArray(practiceFlags);
  return shuffled.map((flag) => {
    const options = generateOptions(flag, allFlags, 'medium');
    return { flag, options };
  });
}

function generateOptions(correctFlag: FlagItem, pool: FlagItem[], mode: GameMode, difficulty?: 'easy' | 'medium' | 'hard'): string[] {
  const effectiveDifficulty = difficulty || (mode === 'easy' ? 'easy' : mode === 'hard' ? 'hard' : 'medium');
  if (effectiveDifficulty === 'hard' || mode === 'flashflag' || mode === 'flagpuzzle') return [];

  const choiceCount = effectiveDifficulty === 'easy' ? EASY_CHOICE_COUNT : STANDARD_CHOICE_COUNT;
  const otherFlags = pool.filter((f) => f.id !== correctFlag.id);

  // Prioritize twin flags as wrong options so look-alikes appear together
  const twinNames = twinPairs[correctFlag.name] || [];
  const twinFlags = otherFlags.filter((f) => twinNames.includes(f.name));
  const nonTwinFlags = otherFlags.filter((f) => !twinNames.includes(f.name));

  const wrongCount = choiceCount - 1;
  const selectedTwins = shuffleArray(twinFlags).slice(0, wrongCount);
  const remainingCount = wrongCount - selectedTwins.length;
  const selectedOthers = shuffleArray(nonTwinFlags).slice(0, remainingCount);

  const wrongOptions = [...selectedTwins, ...selectedOthers].map((f) => f.name);

  return shuffleArray([correctFlag.name, ...wrongOptions]);
}

export function checkAnswer(userAnswer: string, correctName: string): boolean {
  const normalize = (s: string) =>
    s.toLowerCase()
      .trim()
      .replace(/['']/g, "'")
      .replace(/[-–—]/g, ' ')
      .replace(/\s+/g, ' ');

  const stripAccents = (s: string) =>
    s.normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  const normalizedAnswer = normalize(userAnswer);
  const normalizedCorrect = normalize(correctName);

  // Exact match (after normalization)
  if (normalizedAnswer === normalizedCorrect) return true;

  // Accent-insensitive match (e.g. "Cote d'Ivoire" matches "Côte d'Ivoire")
  if (stripAccents(normalizedAnswer) === stripAccents(normalizedCorrect)) return true;

  // Check alias/typo map
  const alias = countryAliases[normalizedAnswer];
  if (alias && normalize(alias) === normalizedCorrect) return true;

  // Check against translated name (so non-English typed answers are accepted)
  const translated = translateName(correctName);
  if (translated !== correctName) {
    const normalizedTranslated = normalize(translated);
    if (normalizedAnswer === normalizedTranslated) return true;
    if (stripAccents(normalizedAnswer) === stripAccents(normalizedTranslated)) return true;
  }

  return false;
}

export function calculateAccuracy(results: GameResult[]): number {
  if (results.length === 0) return 0;
  const correct = results.filter((r) => r.correct).length;
  return Math.round((correct / results.length) * 100);
}

export function getStreakFromResults(results: GameResult[]): number {
  let maxStreak = 0;
  let currentStreak = 0;

  for (const result of results) {
    if (result.correct) {
      currentStreak++;
      maxStreak = Math.max(maxStreak, currentStreak);
    } else {
      currentStreak = 0;
    }
  }

  return maxStreak;
}

