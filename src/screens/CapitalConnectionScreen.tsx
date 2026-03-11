import React, { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  Animated,
  Platform,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { colors, spacing, typography, fontFamily, fontSize, buttons, borderRadius } from '../utils/theme';
import { useLayout } from '../utils/useLayout';
import { hapticTap, hapticCorrect, hapticWrong, playWrongSound } from '../utils/feedback';
import { shuffleArray } from '../utils/gameEngine';
import { RootStackParamList } from '../types/navigation';
import { FlagItem, GameResult } from '../types';
import { countries } from '../data/countries';
import { countryCapitals } from '../data/countryCapitals';
import { countryCities } from '../data/countryCities';
import FlagImage from '../components/FlagImage';
import GameTopBar from '../components/GameTopBar';
import GameFeedback from '../components/GameFeedback';
import ScreenContainer from '../components/ScreenContainer';
import { t } from '../utils/i18n';
import { flagName } from '../data/countryNames';

type Props = NativeStackScreenProps<RootStackParamList, 'CapitalConnection'>;

interface QuestionData {
  flag: FlagItem;
  correctCapital: string;
  options: string[];
}

function generateQuestions(count: number): QuestionData[] {
  // Prefer countries that have same-country city distractors
  const eligible = countries.filter((c) => countryCapitals[c.id]);
  const withCities = eligible.filter((c) => countryCities[c.id]?.length >= 3);
  const pool = withCities.length >= count ? withCities : eligible;
  const selected = shuffleArray(pool).slice(0, count);

  return selected.map((flag) => {
    const correctCapital = countryCapitals[flag.id];
    const localCities = countryCities[flag.id] ?? [];

    let wrongOptions: string[];
    if (localCities.length >= 3) {
      // Use cities from the same country as distractors
      wrongOptions = shuffleArray(localCities.filter((c) => c !== correctCapital)).slice(0, 3);
    } else {
      // Fallback: use capitals from other countries
      const otherCapitals = eligible
        .filter((c) => c.id !== flag.id)
        .map((c) => countryCapitals[c.id]);
      wrongOptions = shuffleArray(otherCapitals).slice(0, 3);
    }

    const options = shuffleArray([correctCapital, ...wrongOptions]);
    return { flag, correctCapital, options };
  });
}

export default function CapitalConnectionScreen({ navigation, route }: Props) {
  const { config } = route.params;
  const { isDesktop } = useLayout();
  const questions = useMemo(() => generateQuestions(config.questionCount), [config.questionCount]);
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
  const wrongCount = results.filter((r) => !r.correct).length;

  const question = questions[currentIndex] ?? null;
  const correctCount = results.filter((r) => r.correct).length;
  const progress = questions.length > 0 ? (currentIndex + 1) / questions.length : 0;

  // Refs so keyboard handler always calls the latest version
  const handleAnswerRef = useRef<(answer: string) => void>(() => {});
  const goToNextRef = useRef<() => void>(() => {});

  const goToNext = useCallback(() => {
    if (autoAdvanceRef.current) {
      clearTimeout(autoAdvanceRef.current);
      autoAdvanceRef.current = null;
    }
    const newResults = pendingResultsRef.current;
    if (!newResults) return;
    pendingResultsRef.current = null;

    const isEliminated = guessLimit > 0 && newResults.filter((r) => !r.correct).length >= guessLimit;

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
      navigation.replace('Results', { results: newResults, config });
    }
  }, [currentIndex, questions, navigation, config, fadeAnim]);
  goToNextRef.current = goToNext;

  // Keyboard shortcuts: 1-4 to select options, Enter/Space to advance
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const handler = (e: KeyboardEvent) => {
      if (showFeedback && (e.key === 'Enter' || e.key === ' ')) {
        e.preventDefault();
        goToNextRef.current();
        return;
      }
      if (!showFeedback && e.key >= '1' && e.key <= '4' && question) {
        const idx = parseInt(e.key, 10) - 1;
        if (idx < question.options.length) {
          e.preventDefault();
          handleAnswerRef.current(question.options[idx]);
        }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [showFeedback, question]);

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
  handleAnswerRef.current = handleAnswer;

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
            <Text style={styles.livesText}>{guessLimit - wrongCount === 1 ? t('game.life', { count: Math.max(0, guessLimit - wrongCount) }) : t('game.lives', { count: Math.max(0, guessLimit - wrongCount) })}</Text>
          ) : undefined
        }
      />

      <Animated.View style={[styles.questionContainer, { opacity: fadeAnim }]}>
        <View style={styles.flagContainer}>
          <FlagImage
            countryCode={question.flag.id}
            emoji={question.flag.emoji}
            size="hero"
          />
        </View>

        <Text style={styles.prompt}>{t('capital.whatIsCapital', { name: flagName(question.flag) })}</Text>

        <View style={[styles.optionsContainer, isDesktop && styles.optionsContainerDesktop]}>
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

            const keyHint = isDesktop && !showFeedback ? `${index + 1}` : null;

            return (
              <TouchableOpacity
                key={`${currentIndex}-${index}`}
                style={[optionStyle, isDesktop && styles.optionButtonDesktop]}
                onPress={() => handleAnswer(option)}
                disabled={showFeedback}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel={option}
              >
                <View style={styles.optionInner}>
                  {keyHint && <Text style={styles.keyHint}>{keyHint}</Text>}
                  <Text style={textStyle}>{option}</Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        {showFeedback && (
          <GameFeedback
            correct={selectedAnswer === question.correctCapital}
            correctAnswer={question.correctCapital}
          />
        )}
      </Animated.View>
      </ScreenContainer>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  progressBar: {
    height: 3,
    backgroundColor: colors.border,
    width: '100%',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.ink,
  },
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
  optionsContainerDesktop: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  optionButtonDesktop: {
    flexBasis: '48%',
    flexGrow: 1,
  },
  optionInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  keyHint: {
    fontFamily: fontFamily.uiLabel,
    fontSize: fontSize.sm,
    color: colors.textTertiary,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.sm,
    width: 22,
    height: 22,
    lineHeight: 20,
    textAlign: 'center',
    overflow: 'hidden',
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
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.xl },
  emptyTitle: { ...typography.heading, color: colors.text, marginBottom: spacing.sm },
  emptyBody: { ...typography.body, color: colors.textSecondary, textAlign: 'center', marginBottom: spacing.xl },
  emptyButton: { ...buttons.secondary },
  emptyButtonText: { ...buttons.secondaryText },
});
