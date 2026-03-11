import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  SafeAreaView,
  Animated,
  Keyboard,
  ScrollView,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { colors, spacing, typography, fontFamily, fontSize, nav, buttons, borderRadius } from '../utils/theme';
import { useLayout } from '../utils/useLayout';
import { GameQuestion, GameResult } from '../types';
import { generateQuestions, generateDailyQuestions, generatePracticeQuestions, checkAnswer } from '../utils/gameEngine';
import { getMissedFlagIds } from '../utils/storage';
import { hapticCorrect, hapticWrong, hapticTap, playCorrectSound, playWrongSound } from '../utils/feedback';
import { t } from '../utils/i18n';
import { translateName, flagName } from '../data/countryNames';
import FlagImage from '../components/FlagImage';
import MapImage from '../components/MapImage';
import { useGameAnimations } from '../hooks/useGameAnimations';
import { getFlagByName, getFlagsForCategory } from '../data';
import { RootStackParamList } from '../types/navigation';
import GameTopBar from '../components/GameTopBar';
import ScreenContainer from '../components/ScreenContainer';

type Props = NativeStackScreenProps<RootStackParamList, 'Game'>;

export default function GameScreen({ route, navigation }: Props) {
  const { config } = route.params;
  const { isDesktop } = useLayout();
  const isTimeAttack = config.mode === 'timeattack';
  const [questions, setQuestions] = useState<GameQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [results, setResults] = useState<GameResult[]>([]);
  const [textInput, setTextInput] = useState('');
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [lastAnswerCorrect, setLastAnswerCorrect] = useState(false);
  const [currentStreak, setCurrentStreak] = useState(0);
  const [wrongCount, setWrongCount] = useState(0);
  const guessLimit = config.guessLimit ?? 0; // 0 = unlimited
  const livesRemaining = guessLimit > 0 ? guessLimit - wrongCount : null;
  const [questionStartTime, setQuestionStartTime] = useState(Date.now());
  const [timeLeft, setTimeLeft] = useState(config.timeLimit || 60);
  const { fadeAnim, streakScale, shakeAnim, animateStreak, animateWrong, animateTransition } = useGameAnimations();

  useEffect(() => {
    if (config.mode === 'daily') {
      const q = generateDailyQuestions();
      setQuestions(q);
      setQuestionStartTime(Date.now());
    } else if (config.mode === 'practice') {
      getMissedFlagIds().then((ids) => {
        const q = generatePracticeQuestions(ids);
        setQuestions(q);
        setQuestionStartTime(Date.now());
      });
    } else {
      const timeAttackConfig = isTimeAttack
        ? { ...config, questionCount: 999 }
        : config;
      const q = generateQuestions(timeAttackConfig);
      setQuestions(q);
      setQuestionStartTime(Date.now());
    }
  }, []);

  // Countdown timer for timeattack mode
  useEffect(() => {
    if (!isTimeAttack) return;
    const interval = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          clearInterval(interval);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [isTimeAttack]);

  const pendingResultsRef = useRef<GameResult[] | null>(null);
  const autoAdvanceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wrongCountRef = useRef(0);
  const resultsRef = useRef<GameResult[]>([]);

  // Clean up auto-advance timer on unmount
  useEffect(() => {
    return () => {
      if (autoAdvanceRef.current) clearTimeout(autoAdvanceRef.current);
    };
  }, []);

  // When timeLeft hits 0, navigate to results
  useEffect(() => {
    if (isTimeAttack && timeLeft === 0) {
      const finalResults = pendingResultsRef.current ?? results;
      if (finalResults.length > 0) {
        if (autoAdvanceRef.current) {
          clearTimeout(autoAdvanceRef.current);
          autoAdvanceRef.current = null;
        }
        navigation.replace('Results', { results: finalResults, config });
      }
    }
  }, [timeLeft]);

  const currentQuestion = questions[currentIndex];
  const isHard = config.mode === 'hard';
  const isMapMode = config.displayMode === 'map';
  const isAutocomplete = isHard && config.autocomplete === true;

  const categoryCountryNames = useMemo(
    () => getFlagsForCategory(config.category).map((f) => f.name).sort(),
    [config.category],
  );

  // Build pairs of { english, display } for suggestion matching on translated names
  const namePairs = useMemo(
    () => categoryCountryNames.map((name) => ({ english: name, display: translateName(name) })),
    [categoryCountryNames],
  );

  const suggestions = useMemo(() => {
    if (!isAutocomplete || textInput.trim().length < 1 || showFeedback) return [];
    const query = textInput.trim().toLowerCase();
    return namePairs
      .filter((p) => p.display.toLowerCase().includes(query) || p.english.toLowerCase().includes(query))
      .slice(0, 5);
  }, [isAutocomplete, textInput, showFeedback, namePairs]);
  const progress = questions.length > 0 ? (currentIndex + 1) / questions.length : 0;

  const goToNext = useCallback(() => {
    if (autoAdvanceRef.current) {
      clearTimeout(autoAdvanceRef.current);
      autoAdvanceRef.current = null;
    }
    const newResults = pendingResultsRef.current;
    if (!newResults) return;
    pendingResultsRef.current = null;

    if (currentIndex < questions.length - 1) {
      animateTransition(() => {
        setResults(newResults);
        setCurrentIndex((i) => i + 1);
        setSelectedAnswer(null);
        setShowFeedback(false);
        setLastAnswerCorrect(false);
        setTextInput('');
        setQuestionStartTime(Date.now());
        Keyboard.dismiss();
      });
    } else {
      navigation.replace('Results', { results: newResults, config });
    }
  }, [currentIndex, questions, navigation, config, animateTransition]);

  const handleAnswer = useCallback(
    (answer: string) => {
      if (showFeedback) return;

      hapticTap();
      const correct = checkAnswer(answer, currentQuestion.flag.name);
      const timeTaken = Date.now() - questionStartTime;

      setSelectedAnswer(answer);
      setShowFeedback(true);
      setLastAnswerCorrect(correct);

      if (correct) {
        hapticCorrect();
        playCorrectSound();
        setCurrentStreak((s) => s + 1);
        animateStreak();
      } else {
        hapticWrong();
        playWrongSound();
        setCurrentStreak(0);
        wrongCountRef.current += 1;
        setWrongCount(wrongCountRef.current);
        animateWrong();
      }

      const result: GameResult = {
        question: currentQuestion,
        userAnswer: answer,
        correct,
        timeTaken,
      };

      const newResults = [...resultsRef.current, result];
      pendingResultsRef.current = newResults;
      resultsRef.current = newResults;

      // Check if guess limit reached (game over)
      const isEliminated = guessLimit > 0 && wrongCountRef.current >= guessLimit;

      const feedbackDelay = isTimeAttack
        ? (correct ? 300 : 600)
        : (correct ? 600 : 1200);

      if (isEliminated) {
        autoAdvanceRef.current = setTimeout(() => {
          navigation.replace('Results', { results: newResults, config });
        }, feedbackDelay);
      } else {
        autoAdvanceRef.current = setTimeout(() => {
          goToNext();
        }, feedbackDelay);
      }
    },
    [showFeedback, currentQuestion, questionStartTime, isTimeAttack, animateStreak, animateWrong, goToNext, guessLimit],
  );

  const handleSubmitHard = () => {
    if (textInput.trim().length > 0) {
      handleAnswer(textInput.trim());
    }
  };

  const handleSelectSuggestion = (name: string) => {
    setTextInput(name);
    handleAnswer(name);
  };

  // Keyboard shortcuts for web (1-4 to select options in multiple-choice mode)
  useEffect(() => {
    if (Platform.OS !== 'web' || isHard) return;
    const handler = (e: KeyboardEvent) => {
      if (showFeedback) return;
      const key = e.key;
      if (key >= '1' && key <= '4' && currentQuestion) {
        const idx = parseInt(key, 10) - 1;
        if (idx < currentQuestion.options.length) {
          e.preventDefault();
          handleAnswer(currentQuestion.options[idx]);
        }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [showFeedback, currentQuestion, handleAnswer, isHard]);

  if (questions.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.ink} />
          <Text style={styles.loadingText}>{t('common.loading')}</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {isTimeAttack ? (
        <View style={styles.timerBar}>
          <Text style={[styles.timerText, timeLeft <= 10 && styles.timerTextUrgent]}>
            {t('game.timeLeft', { seconds: timeLeft })}
          </Text>
          <View style={[styles.timerFill, { width: `${(timeLeft / (config.timeLimit || 60)) * 100}%` }]} />
        </View>
      ) : (
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
        </View>
      )}

      <ScreenContainer flex game>
      <GameTopBar
        onExit={() => {
          if (autoAdvanceRef.current) clearTimeout(autoAdvanceRef.current);
          const currentResults = pendingResultsRef.current ?? results;
          if (currentResults.length > 0) {
            navigation.replace('Results', { results: currentResults, config });
          } else {
            navigation.popToTop();
          }
        }}
        center={
          <View style={styles.centerInfo}>
            {isTimeAttack ? (
              <Text style={styles.counter}>
                {t('game.correctCount', { count: results.filter((r) => r.correct).length })}
              </Text>
            ) : (
              <Text style={styles.counter}>
                {t('game.questionOf', { current: currentIndex + 1, total: questions.length })}
              </Text>
            )}
            {currentStreak >= 2 ? (
              <Animated.Text
                style={[styles.streakText, { transform: [{ scale: streakScale }] }]}
              >
                {t('game.streak', { count: currentStreak })}
              </Animated.Text>
            ) : (
              !isTimeAttack && (
                <Text style={styles.score}>
                  {t('game.correctCount', { count: results.filter((r) => r.correct).length })}
                </Text>
              )
            )}
          </View>
        }
        right={
          livesRemaining !== null ? (
            <Text style={[styles.livesText, livesRemaining === 1 && styles.livesTextUrgent]}>
              {livesRemaining === 1 ? t('game.life', { count: livesRemaining }) : t('game.lives', { count: livesRemaining })}
            </Text>
          ) : undefined
        }
      />

      <Animated.View
        style={[
          styles.questionContainer,
          { opacity: fadeAnim, transform: [{ translateX: shakeAnim }] },
        ]}
      >
        <View style={styles.flagContainer}>
          {isMapMode ? (
            <MapImage countryCode={currentQuestion.flag.id} size="hero" />
          ) : (
            <FlagImage
              countryCode={currentQuestion.flag.id}
              size="hero"
              emoji={currentQuestion.flag.emoji}
            />
          )}
        </View>

        {isHard && (
          <Text style={styles.questionText}>
            {isMapMode ? t('game.nameCountry') : t('game.typePrompt')}
          </Text>
        )}

        {isHard ? (
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.textInput}
              value={textInput}
              onChangeText={setTextInput}
              placeholder={t('game.typePlaceholder')}
              placeholderTextColor={colors.textTertiary}
              autoCapitalize="words"
              autoCorrect={false}
              returnKeyType="done"
              onSubmitEditing={handleSubmitHard}
              editable={!showFeedback}
              accessibilityLabel={t('game.typePlaceholder')}
            />
            {suggestions.length > 0 && (
              <ScrollView
                style={styles.suggestionsContainer}
                keyboardShouldPersistTaps="handled"
                nestedScrollEnabled
              >
                {suggestions.map((pair) => (
                  <TouchableOpacity
                    key={pair.english}
                    style={styles.suggestionItem}
                    onPress={() => handleSelectSuggestion(pair.english)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.suggestionText}>{pair.display}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}
            <TouchableOpacity
              style={[
                styles.submitButton,
                textInput.trim().length === 0 && styles.submitButtonDisabled,
              ]}
              onPress={handleSubmitHard}
              disabled={textInput.trim().length === 0 || showFeedback}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel={t('common.submit')}
            >
              <Text style={styles.submitButtonText}>{t('common.submit')}</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={isMapMode ? styles.optionsContainerMap : (isDesktop ? styles.optionsContainerDesktop : styles.optionsContainer)}>
            {currentQuestion.options.map((option, index) => {
              const isSelected = selectedAnswer === option;
              const isCorrect = option === currentQuestion.flag.name;
              const optionFlag = isMapMode ? getFlagByName(option) : null;

              let optionStyle = isMapMode ? styles.optionButtonMap : (isDesktop ? styles.optionButtonDesktop : styles.optionButton);
              let textStyle = styles.optionText;

              if (showFeedback) {
                if (isCorrect) {
                  optionStyle = isMapMode
                    ? { ...styles.optionButtonMap, ...styles.optionCorrectMap }
                    : { ...(isDesktop ? styles.optionButtonDesktop : styles.optionButton), ...styles.optionCorrect };
                  textStyle = { ...styles.optionText, ...styles.optionTextFeedback };
                } else if (isSelected && !isCorrect) {
                  optionStyle = isMapMode
                    ? { ...styles.optionButtonMap, ...styles.optionWrongMap }
                    : { ...(isDesktop ? styles.optionButtonDesktop : styles.optionButton), ...styles.optionWrong };
                  textStyle = { ...styles.optionText, ...styles.optionTextFeedback };
                }
              }

              const keyHint = !isMapMode && isDesktop && !showFeedback ? `${index + 1}` : null;

              return (
                <TouchableOpacity
                  key={`${currentIndex}-${index}`}
                  style={optionStyle}
                  onPress={() => handleAnswer(option)}
                  disabled={showFeedback}
                  activeOpacity={0.7}
                  accessibilityRole="button"
                  accessibilityLabel={isMapMode && optionFlag ? optionFlag.name : option}
                >
                  {isMapMode && optionFlag ? (
                    <FlagImage
                      countryCode={optionFlag.id}
                      size="medium"
                      emoji={optionFlag.emoji}
                    />
                  ) : (
                    <View style={styles.optionInner}>
                      {keyHint && <Text style={styles.keyHint}>{keyHint}</Text>}
                      <Text style={textStyle}>{translateName(option)}</Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {showFeedback && (
          <View style={styles.feedbackContainer}>
            {lastAnswerCorrect ? (
              <Text style={styles.feedbackCorrect} accessibilityLiveRegion="polite">{t('common.correct')}</Text>
            ) : (
              <Text style={styles.feedbackWrong} accessibilityLiveRegion="polite">
                {flagName(currentQuestion.flag)}
              </Text>
            )}
          </View>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    ...typography.body,
    color: colors.textSecondary,
  },
  progressBar: {
    height: 3,
    backgroundColor: colors.border,
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.ink,
  },
  timerBar: {
    height: 28,
    backgroundColor: colors.border,
    justifyContent: 'center',
    overflow: 'hidden',
  },
  timerText: {
    ...typography.captionBold,
    color: colors.text,
    textAlign: 'center',
    zIndex: 1,
  },
  timerTextUrgent: {
    color: colors.error,
  },
  timerFill: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    backgroundColor: colors.accent,
    opacity: 0.15,
    borderRadius: borderRadius.none,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  quitButton: {
    ...nav.backButton,
  },
  quitText: {
    ...nav.backText,
  },
  centerInfo: {
    alignItems: 'center',
  },
  counter: {
    ...typography.bodyBold,
    color: colors.text,
  },
  streakText: {
    ...typography.caption,
    color: colors.accent,
  },
  score: {
    ...typography.caption,
    color: colors.success,
  },
  quitSpacer: {
    width: 60,
  },
  livesText: {
    ...typography.bodyBold,
    color: colors.error,
    width: 60,
    textAlign: 'right',
  },
  livesTextUrgent: {
    color: colors.accent,
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
  questionText: {
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
  optionsContainerMap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    justifyContent: 'center',
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
  optionButtonDesktop: {
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    flexBasis: '48%',
    flexGrow: 1,
  },
  optionInner: {
    flexDirection: 'row',
    alignItems: 'center',
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
  optionButtonMap: {
    padding: spacing.xs,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.white,
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
  optionCorrectMap: {
    borderColor: colors.success,
    borderWidth: 3,
  },
  optionWrongMap: {
    borderColor: colors.error,
    borderWidth: 3,
  },
  optionText: {
    ...typography.bodyBold,
    color: colors.text,
  },
  optionTextFeedback: {
    color: colors.white,
  },
  inputContainer: {
    gap: spacing.md,
  },
  suggestionsContainer: {
    maxHeight: 200,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
  },
  suggestionItem: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  suggestionText: {
    ...typography.body,
    color: colors.text,
  },
  textInput: {
    backgroundColor: colors.surface,
    padding: spacing.lg,
    ...typography.body,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    textAlign: 'center',
  },
  submitButton: {
    ...buttons.primary,
  },
  submitButtonDisabled: {
    backgroundColor: colors.textTertiary,
  },
  submitButtonText: {
    ...buttons.primaryText,
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
});
