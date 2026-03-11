import { GameMode, FlagItem, GameQuestion, GameResult, GameConfig } from '../types';
import { getFlagsForCategory, getAllFlags } from '../data';
import { countryAliases, twinPairs } from '../data/countryAliases';
import { translateName } from '../data/countryNames';
import { colors } from './theme';

export function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
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
  return new Date().toISOString().slice(0, 10);
}

export function getDailyNumber(): number {
  const start = new Date('2026-03-11T00:00:00Z').getTime();
  const now = new Date(getTodayDateString() + 'T00:00:00Z').getTime();
  return Math.floor((now - start) / 86400000) + 1;
}

export function generateDailyQuestions(dateStr?: string): GameQuestion[] {
  const date = dateStr || getTodayDateString();
  const seed = dateSeed(date);
  const allFlags = getAllFlags();
  const shuffled = seededShuffle(allFlags, seed);
  const selected = shuffled.slice(0, 10);

  const rng = seededRandom(seed + 1000);

  return selected.map((flag) => {
    const otherFlags = allFlags.filter((f) => f.id !== flag.id);
    const twinNames = twinPairs[flag.name] || [];
    const twins = otherFlags.filter((f) => twinNames.includes(f.name));
    const nonTwins = otherFlags.filter((f) => !twinNames.includes(f.name));

    // Pick 3 wrong answers, prioritizing twins
    const wrongCount = 3;
    const seededShuffleTwins = [...twins].sort(() => rng() - 0.5);
    const selectedTwins = seededShuffleTwins.slice(0, wrongCount);
    const remaining = wrongCount - selectedTwins.length;
    const seededShuffleOthers = [...nonTwins].sort(() => rng() - 0.5);
    const selectedOthers = seededShuffleOthers.slice(0, remaining);

    const wrongOptions = [...selectedTwins, ...selectedOthers].map((f) => f.name);
    const allOptions = [flag.name, ...wrongOptions];
    // Deterministic shuffle of options
    const options = allOptions.sort(() => rng() - 0.5);

    return { flag, options };
  });
}

export function generateDailyShareGrid(results: GameResult[]): string {
  const dailyNum = getDailyNumber();
  const correct = results.filter((r) => r.correct).length;
  const grid = results.map((r) => (r.correct ? '\u2b1b' : '\u2b1c')).join('');
  // Split into rows of 5
  const row1 = grid.slice(0, 5);
  const row2 = grid.slice(5, 10);
  return `Flag That #${dailyNum}\n${correct}/10\n\n${row1}\n${row2}\n\nflagthat.app`;
}

export function generateShareGrid(results: GameResult[], modeLabel: string, categoryLabel: string): string {
  const correct = results.filter((r) => r.correct).length;
  const accuracy = calculateAccuracy(results);
  const grade = getGrade(accuracy);
  const grid = results.map((r) => (r.correct ? '\u2b1b' : '\u2b1c')).join('');
  // Split into rows of 5
  const rows: string[] = [];
  for (let i = 0; i < grid.length; i += 5) {
    rows.push(grid.slice(i, i + 5));
  }
  const gridStr = rows.join('\n');
  const perfectLine = accuracy === 100 ? '\nPERFECT SCORE!' : '';
  return `Flag That - ${modeLabel}\n${correct}/${results.length} (${grade.label})${perfectLine}\n\n${gridStr}\n\nflagthat.app`;
}

export function generateQuestions(config: GameConfig): GameQuestion[] {
  const categoryFlags = getFlagsForCategory(config.category);

  if (categoryFlags.length === 0) return [];

  const shuffledFlags = shuffleArray(categoryFlags);
  const count = Math.min(config.questionCount, categoryFlags.length);
  const selectedFlags = shuffledFlags.slice(0, count);

  return selectedFlags.map((flag) => {
    const options = generateOptions(flag, categoryFlags, config.mode);
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

function generateOptions(correctFlag: FlagItem, pool: FlagItem[], mode: GameMode): string[] {
  if (mode === 'hard' || mode === 'flagflash' || mode === 'flagpuzzle') return [];

  const choiceCount = (mode === 'timeattack' || mode === 'medium' || mode === 'baseline') ? 4 : 2;
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

export function getGrade(accuracy: number): { label: string; color: string } {
  if (accuracy >= 95) return { label: 'S', color: colors.gradeS };
  if (accuracy >= 90) return { label: 'A+', color: colors.gradeA };
  if (accuracy >= 80) return { label: 'A', color: colors.gradeA };
  if (accuracy >= 70) return { label: 'B', color: colors.gradeB };
  if (accuracy >= 60) return { label: 'C', color: colors.gradeC };
  if (accuracy >= 50) return { label: 'D', color: colors.gradeD };
  return { label: 'F', color: colors.gradeF };
}
