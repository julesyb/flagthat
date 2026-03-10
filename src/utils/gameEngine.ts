import { GameMode, FlagItem, GameQuestion, GameResult, GameConfig } from '../types';
import { getFlagsForCategory, getAllFlags } from '../data';
import { countryAliases, twinPairs } from '../data/countryAliases';
import { colors } from './theme';

function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export function generateQuestions(config: GameConfig): GameQuestion[] {
  const categoryFlags = getFlagsForCategory(config.category);

  if (categoryFlags.length === 0) return [];

  const shuffledFlags = shuffleArray(categoryFlags);
  const count = Math.min(config.questionCount, categoryFlags.length);
  const selectedFlags = shuffledFlags.slice(0, count);

  // For options, pull from all flags to make it interesting
  const allFlags = getAllFlags();

  return selectedFlags.map((flag) => {
    const options = generateOptions(flag, allFlags, config.mode);
    return { flag, options };
  });
}

function generateOptions(correctFlag: FlagItem, allFlags: FlagItem[], mode: GameMode): string[] {
  if (mode === 'hard' || mode === 'flagflash') return [];

  const choiceCount = mode === 'easy' ? 2 : 4;
  const otherFlags = allFlags.filter((f) => f.id !== correctFlag.id);

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
