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
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ThemeColors, spacing, typography, fontFamily, buildNav, buildButtons, borderRadius } from '../utils/theme';
import { useTheme } from '../contexts/ThemeContext';
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
import { buildChallengeQuestions } from '../utils/challengeCode';
import { countCorrect, calculateProgress } from '../utils/gameHelpers';

type Props = NativeStackScreenProps<RootStackParamList, 'Game'>;

export default function GameScreen({ route, navigation }: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { config, challenge, playerName } = route.params;
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
    if (challenge) {
      const q = buildChallengeQuestions(challenge.flagIds, challenge.mode, challenge.difficulty) || [];
      setQuestions(q);
      setQuestionStartTime(Date.now());
    } else if (config.mode === 'daily') {
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
        navigation.replace('Results', { results: finalResults, config, ...(challenge && { challenge, playerName }) });
      }
    }
  }, [timeLeft]);

  const currentQuestion = questions[currentIndex];
  const isHard = config.mode === 'hard' || config.difficulty === 'hard';
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
  const progress = calculateProgress(currentIndex, questions.length);

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
      navigation.replace('Results', { results: newResults, config, ...(challenge && { challenge, playerName }) });
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
        : (correct && !isMapMode ? 600 : 1200);

      if (isEliminated) {
        autoAdvanceRef.current = setTimeout(() => {
          navigation.replace('Results', { results: newResults, config, ...(challenge && { challenge, playerName }) });
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
            navigation.replace('Results', { results: currentResults, config, ...(challenge && { challenge, playerName }) });
          } else {
            navigation.popToTop();
          }
        }}
        center={
          <View style={styles.centerInfo}>
            {isTimeAttack ? (
              <Text style={styles.counter}>
                {t('game.correctCount', { count: countCorrect(results) })}
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
                  {t('game.correctCount', { count: countCorrect(results) })}
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
                    accessibilityRole="button"
                    accessibilityLabel={pair.display}
                    accessibilityHint={t('a11y.selectAnswer')}
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
              accessibilityState={{ disabled: textInput.trim().length === 0 || showFeedback }}
            >
              <Text style={styles.submitButtonText}>{t('common.submit')}</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={isMapMode ? styles.optionsContainerMap : styles.optionsContainer}>
            {currentQuestion.options.map((option, index) => {
              const isSelected = selectedAnswer === option;
              const isCorrect = option === currentQuestion.flag.name;
              const optionFlag = isMapMode ? getFlagByName(option) : null;

              let optionStyle = isMapMode ? styles.optionButtonMap : styles.optionButton;
              let textStyle = styles.optionText;

              if (showFeedback) {
                if (isCorrect) {
                  optionStyle = isMapMode
                    ? { ...styles.optionButtonMap, ...styles.optionCorrectMap }
                    : { ...styles.optionButton, ...styles.optionCorrect };
                  textStyle = { ...styles.optionText, ...styles.optionTextFeedback };
                } else if (isSelected && !isCorrect) {
                  optionStyle = isMapMode
                    ? { ...styles.optionButtonMap, ...styles.optionWrongMap }
                    : { ...styles.optionButton, ...styles.optionWrong };
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
                  accessibilityLabel={isMapMode && optionFlag ? optionFlag.name : translateName(option)}
                  accessibilityState={{ disabled: showFeedback }}
                >
                  {isMapMode && optionFlag ? (
                    <View style={styles.mapOptionContent}>
                      <FlagImage
                        countryCode={optionFlag.id}
                        size="medium"
                      />
                      <Text
                        style={[
                          styles.mapOptionLabel,
                          !showFeedback && styles.mapOptionLabelHidden,
                          showFeedback && isCorrect && styles.mapOptionLabelCorrect,
                          showFeedback && isSelected && !isCorrect && styles.mapOptionLabelWrong,
                        ]}
                        numberOfLines={1}
                      >
                        {translateName(option)}
                      </Text>
                    </View>
                  ) : (
                    <Text style={textStyle} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75}>{translateName(option)}</Text>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {showFeedback && (
          <View style={styles.feedbackContainer}>
            {lastAnswerCorrect ? (
              <View style={styles.feedbackCorrectContainer}>
                <Text style={styles.feedbackCorrect} accessibilityLiveRegion="polite">{t('common.correct')}</Text>
                {isMapMode && (
                  <Text style={styles.feedbackCountryName}>{flagName(currentQuestion.flag)}</Text>
                )}
              </View>
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

const createStyles = (colors: ThemeColors) => {
  const btn = buildButtons(colors);
  const n = buildNav(colors);
  return StyleSheet.create({
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
    ...n.backButton,
  },
  quitText: {
    ...n.backText,
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
    paddingTop: spacing.xl,
    justifyContent: 'flex-start',
  },
  flagContainer: {
    alignItems: 'center',
    alignSelf: 'center',
    width: '100%',
    maxWidth: 420,
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
  optionsContainerMap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    justifyContent: 'center',
  },
  optionButton: {
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
  },
  optionButtonMap: {
    padding: spacing.xs,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.surface,
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
    backgroundColor: colors.successBg,
  },
  optionWrongMap: {
    borderColor: colors.error,
    borderWidth: 3,
    backgroundColor: colors.errorBg,
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
    ...btn.primary,
  },
  submitButtonDisabled: {
    backgroundColor: colors.textTertiary,
  },
  submitButtonText: {
    ...btn.primaryText,
  },
  mapOptionContent: {
    alignItems: 'center',
    gap: spacing.xs,
  },
  mapOptionLabel: {
    ...typography.captionBold,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  mapOptionLabelHidden: {
    opacity: 0,
  },
  mapOptionLabelCorrect: {
    color: colors.success,
  },
  mapOptionLabelWrong: {
    color: colors.error,
  },
  feedbackContainer: {
    marginTop: spacing.lg,
    alignItems: 'center',
  },
  feedbackCorrectContainer: {
    alignItems: 'center',
    gap: spacing.xs,
  },
  feedbackCorrect: {
    ...typography.heading,
    color: colors.success,
  },
  feedbackCountryName: {
    ...typography.bodyBold,
    color: colors.textSecondary,
  },
  feedbackWrong: {
    ...typography.heading,
    color: colors.error,
  },
  });
};
