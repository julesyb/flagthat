import React, { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  Animated,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { spacing, typography, fontFamily, fontSize, buttons, borderRadius, ThemeColors } from '../utils/theme';
import { useTheme } from '../contexts/ThemeContext';
import { hapticTap, hapticCorrect, hapticWrong, playWrongSound } from '../utils/feedback';
import { shuffleArray } from '../utils/gameEngine';
import { RootStackParamList } from '../types/navigation';
import { FlagItem, GameResult } from '../types';
import { countries } from '../data/countries';
import { countryCapitals } from '../data/countryCapitals';
import { countryCities } from '../data/countryCities';
import FlagImage from '../components/FlagImage';
import GameTopBar from '../components/GameTopBar';
import ScreenContainer from '../components/ScreenContainer';
import { t } from '../utils/i18n';
import { flagName } from '../data/countryNames';
import { countCorrect, countWrong, calculateProgress } from '../utils/gameHelpers';

type Props = NativeStackScreenProps<RootStackParamList, 'CapitalConnection'>;

interface QuestionData {
  flag: FlagItem;
  correctCapital: string;
  options: string[];
}

const flagById = new Map(countries.map((c) => [c.id, c]));

function buildQuestionForFlag(flag: FlagItem, difficulty?: 'easy' | 'medium' | 'hard'): QuestionData | null {
  const correctCapital = countryCapitals[flag.id];
  if (!correctCapital) return null;

  const wrongCount = difficulty === 'easy' ? 1 : 3;
  const localCities = (countryCities[flag.id] ?? []).filter((c) => c !== correctCapital);
  const eligible = countries.filter((c) => countryCapitals[c.id]);
  const otherCapitals = shuffleArray(
    eligible.filter((c) => c.id !== flag.id).map((c) => countryCapitals[c.id])
  );

  let wrongOptions: string[];
  if (difficulty === 'hard') {
    // Hard: prioritize local cities as distractors (same-country cities are trickier)
    const fromLocal = shuffleArray(localCities).slice(0, wrongCount);
    const remaining = wrongCount - fromLocal.length;
    wrongOptions = [...fromLocal, ...otherCapitals.slice(0, remaining)];
  } else if (difficulty === 'easy') {
    // Easy: only use capitals from other countries (more distinct)
    wrongOptions = otherCapitals.slice(0, wrongCount);
  } else {
    // Medium: mix of local cities and other capitals
    if (localCities.length >= wrongCount) {
      wrongOptions = shuffleArray(localCities).slice(0, wrongCount);
    } else {
      wrongOptions = otherCapitals.slice(0, wrongCount);
    }
  }

  const options = shuffleArray([correctCapital, ...wrongOptions]);
  return { flag, correctCapital, options };
}

function generateQuestions(count: number, challengeFlagIds?: string[], difficulty?: 'easy' | 'medium' | 'hard'): QuestionData[] {
  if (challengeFlagIds) {
    const questions: QuestionData[] = [];
    for (const id of challengeFlagIds) {
      const flag = flagById.get(id);
      if (!flag) continue;
      const q = buildQuestionForFlag(flag, difficulty);
      if (q) questions.push(q);
    }
    return questions;
  }

  const eligible = countries.filter((c) => countryCapitals[c.id]);
  const withCities = eligible.filter((c) => countryCities[c.id]?.length >= 3);
  const pool = withCities.length >= count ? withCities : eligible;
  const selected = shuffleArray(pool).slice(0, count);

  const questions: QuestionData[] = [];
  for (const flag of selected) {
    const q = buildQuestionForFlag(flag, difficulty);
    if (q) questions.push(q);
  }
  return questions;
}

export default function CapitalConnectionScreen({ navigation, route }: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { config, challenge, playerName } = route.params;
  const questions = useMemo(
    () => generateQuestions(config.questionCount, challenge?.flagIds, config.difficulty),
    [config.questionCount, challenge, config.difficulty],
  );
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [results, setResults] = useState<GameResult[]>([]);
  const [currentStreak, setCurrentStreak] = useState(0);
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const questionStartTime = useRef(Date.now());
  const autoAdvanceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingResultsRef = useRef<GameResult[] | null>(null);

  // Clean up auto-advance timer on unmount
  useEffect(() => {
    return () => {
      if (autoAdvanceRef.current) clearTimeout(autoAdvanceRef.current);
    };
  }, []);

  const guessLimit = config.guessLimit ?? 0;
  const wrongCnt = countWrong(results);

  const question = questions[currentIndex] ?? null;
  const correctCount = countCorrect(results);
  const progress = calculateProgress(currentIndex, questions.length);

  const goToNext = useCallback(() => {
    if (autoAdvanceRef.current) {
      clearTimeout(autoAdvanceRef.current);
      autoAdvanceRef.current = null;
    }
    const newResults = pendingResultsRef.current;
    if (!newResults) return;
    pendingResultsRef.current = null;

    const isEliminated = guessLimit > 0 && countWrong(newResults) >= guessLimit;

    if (currentIndex < questions.length - 1 && !isEliminated) {
      fadeAnim.setValue(1);
      Animated.timing(fadeAnim, { toValue: 0, duration: 100, useNativeDriver: true }).start(() => {
        setResults(newResults);
        setCurrentIndex((i) => i + 1);
        setSelectedAnswer(null);
        setShowFeedback(false);
        questionStartTime.current = Date.now();
        Animated.timing(fadeAnim, { toValue: 1, duration: 150, useNativeDriver: true }).start();
      });
    } else {
      navigation.replace('Results', { results: newResults, config, ...(challenge && { challenge, playerName }) });
    }
  }, [currentIndex, questions, navigation, config, fadeAnim]);

  const handleAnswer = useCallback((answer: string) => {
    if (showFeedback || !question) return;
    hapticTap();

    const correct = answer === question.correctCapital;
    const timeTaken = Date.now() - questionStartTime.current;

    setSelectedAnswer(answer);
    setShowFeedback(true);

    if (correct) {
      hapticCorrect();
      setCurrentStreak((s) => s + 1);
    } else {
      hapticWrong();
      playWrongSound();
      setCurrentStreak(0);
    }

    const result: GameResult = {
      question: { flag: question.flag, options: question.options },
      userAnswer: answer,
      correct,
      timeTaken,
    };

    const newResults = [...results, result];
    pendingResultsRef.current = newResults;

    const feedbackDelay = correct ? 600 : 1200;
    autoAdvanceRef.current = setTimeout(() => goToNext(), feedbackDelay);
  }, [showFeedback, question, results, goToNext]);

  if (!question) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>{t('capital.noCountries')}</Text>
          <Text style={styles.emptyBody}>
            {t('capital.noCountriesDesc')}
          </Text>
          <TouchableOpacity style={styles.emptyButton} onPress={() => navigation.goBack()}>
            <Text style={styles.emptyButtonText}>{t('common.goBack')}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.progressBar}>
        <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
      </View>

      <ScreenContainer flex game>
      <GameTopBar
        onExit={() => navigation.popToTop()}
        center={
          <View style={styles.centerInfo}>
            <Text style={styles.counter}>
              {t('game.questionOf', { current: currentIndex + 1, total: questions.length })}
            </Text>
            {currentStreak >= 2 ? (
              <Text style={styles.streakText}>{t('game.streak', { count: currentStreak })}</Text>
            ) : (
              <Text style={styles.scoreText}>{t('game.correctCount', { count: correctCount })}</Text>
            )}
          </View>
        }
        right={
          guessLimit > 0 ? (
            <Text style={styles.livesText}>{guessLimit - wrongCnt === 1 ? t('game.life', { count: Math.max(0, guessLimit - wrongCnt) }) : t('game.lives', { count: Math.max(0, guessLimit - wrongCnt) })}</Text>
          ) : undefined
        }
      />

      <Animated.View style={[styles.questionContainer, { opacity: fadeAnim }]}>
        <View style={styles.flagContainer}>
          <FlagImage
            countryCode={question.flag.id}
            size="hero"
          />
        </View>

        <Text style={styles.prompt}>{t('capital.whatIsCapital', { name: flagName(question.flag) })}</Text>

        <View style={styles.optionsContainer}>
          {question.options.map((option, index) => {
            const isSelected = selectedAnswer === option;
            const isCorrect = option === question.correctCapital;

            let optionStyle = styles.optionButton;
            let textStyle = styles.optionText;

            if (showFeedback) {
              if (isCorrect) {
                optionStyle = { ...styles.optionButton, ...styles.optionCorrect };
                textStyle = { ...styles.optionText, ...styles.optionTextFeedback };
              } else if (isSelected && !isCorrect) {
                optionStyle = { ...styles.optionButton, ...styles.optionWrong };
                textStyle = { ...styles.optionText, ...styles.optionTextFeedback };
              }
            }

            return (
              <TouchableOpacity
                key={`${currentIndex}-${index}`}
                style={optionStyle}
                onPress={() => handleAnswer(option)}
                disabled={showFeedback}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel={option}
              >
                <Text style={textStyle}>{option}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {showFeedback && (
          <View style={styles.feedbackContainer}>
            {selectedAnswer === question.correctCapital ? (
              <Text style={styles.feedbackCorrect}>{t('common.correct')}</Text>
            ) : (
              <Text style={styles.feedbackWrong}>{question.correctCapital}</Text>
            )}
          </View>
        )}
      </Animated.View>
      </ScreenContainer>
    </SafeAreaView>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  progressBar: {
    height: 3,
    backgroundColor: colors.border,
    width: '100%',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.ink,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  exitButton: {
    padding: spacing.sm,
    width: 60,
  },
  exitText: {
    fontSize: fontSize.caption,
    fontFamily: fontFamily.uiLabelMedium,
    letterSpacing: 0.5,
    color: colors.textTertiary,
    textTransform: 'uppercase',
  },
  centerInfo: {
    alignItems: 'center',
  },
  counter: {
    ...typography.bodyBold,
    color: colors.text,
  },
  scoreText: {
    ...typography.caption,
    color: colors.success,
  },
  streakText: {
    ...typography.caption,
    color: colors.accent,
  },
  spacer: { width: 60 },
  livesText: { ...typography.bodyBold, color: colors.error, width: 60, textAlign: 'right' },
  questionContainer: {
    flex: 1,
    padding: spacing.lg,
    justifyContent: 'center',
  },
  flagContainer: {
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  prompt: {
    ...typography.caption,
    color: colors.textTertiary,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  optionsContainer: {
    gap: spacing.xs,
  },
  optionButton: {
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
  },
  optionCorrect: {
    backgroundColor: colors.success,
    borderColor: colors.success,
  },
  optionWrong: {
    backgroundColor: colors.error,
    borderColor: colors.error,
  },
  optionText: {
    ...typography.bodyBold,
    color: colors.text,
  },
  optionTextFeedback: {
    color: colors.white,
  },
  feedbackContainer: {
    marginTop: spacing.lg,
    alignItems: 'center',
  },
  feedbackCorrect: {
    ...typography.heading,
    color: colors.success,
  },
  feedbackWrong: {
    ...typography.heading,
    color: colors.error,
  },
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.xl },
  emptyTitle: { ...typography.heading, color: colors.text, marginBottom: spacing.sm },
  emptyBody: { ...typography.body, color: colors.textSecondary, textAlign: 'center', marginBottom: spacing.xl },
  emptyButton: { ...buttons.secondary, backgroundColor: colors.surface, borderColor: colors.border },
  emptyButtonText: { ...buttons.secondaryText, color: colors.textSecondary },
});
