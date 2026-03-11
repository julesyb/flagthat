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
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { colors, spacing, typography, buttons } from '../utils/theme';
import { GameQuestion, GameResult } from '../types';
import { generateQuestions, checkAnswer } from '../utils/gameEngine';
import { hapticCorrect, hapticWrong, hapticTap, playCorrectSound, playWrongSound } from '../utils/feedback';
import FlagImage from '../components/FlagImage';
import MapImage from '../components/MapImage';
import GameTopBar from '../components/GameTopBar';
import { useGameAnimations } from '../hooks/useGameAnimations';
import { getFlagByName } from '../data';
import { RootStackParamList } from '../types/navigation';

type Props = NativeStackScreenProps<RootStackParamList, 'Game'>;

export default function GameScreen({ route, navigation }: Props) {
  const { config } = route.params;
  const [questions, setQuestions] = useState<GameQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [results, setResults] = useState<GameResult[]>([]);
  const [textInput, setTextInput] = useState('');
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [lastAnswerCorrect, setLastAnswerCorrect] = useState(false);
  const [currentStreak, setCurrentStreak] = useState(0);
  const [questionStartTime, setQuestionStartTime] = useState(Date.now());
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { fadeAnim, streakScale, shakeAnim, animateStreak, animateWrong, animateTransition } = useGameAnimations();

  useEffect(() => {
    const q = generateQuestions(config);
    setQuestions(q);
    setQuestionStartTime(Date.now());
  }, []);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const currentQuestion = questions[currentIndex];
  const isHard = config.mode === 'hard';
  const isMapMode = config.displayMode === 'map';
  const progress = questions.length > 0 ? (currentIndex + 1) / questions.length : 0;

  const correctCount = useMemo(
    () => results.filter((r) => r.correct).length,
    [results],
  );

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
        animateWrong();
      }

      const result: GameResult = {
        question: currentQuestion,
        userAnswer: answer,
        correct,
        timeTaken,
      };

      const newResults = [...results, result];

      timeoutRef.current = setTimeout(() => {
        if (currentIndex < questions.length - 1) {
          animateTransition();
          setResults(newResults);
          setCurrentIndex((i) => i + 1);
          setSelectedAnswer(null);
          setShowFeedback(false);
          setLastAnswerCorrect(false);
          setTextInput('');
          setQuestionStartTime(Date.now());
          Keyboard.dismiss();
        } else {
          navigation.replace('Results', { results: newResults, config });
        }
      }, correct ? 600 : 1200);
    },
    [showFeedback, currentQuestion, questionStartTime, results, currentIndex, questions, navigation, config, animateStreak, animateWrong, animateTransition],
  );

  const handleSubmitHard = () => {
    if (textInput.trim().length > 0) {
      handleAnswer(textInput.trim());
    }
  };

  if (questions.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.progressBar}>
        <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
      </View>

      <GameTopBar
        currentIndex={currentIndex}
        totalQuestions={questions.length}
        correctCount={correctCount}
        currentStreak={currentStreak}
        streakScale={streakScale}
        onExit={() => navigation.popToTop()}
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

        {!isHard && (
          <Text style={styles.regionHint}>{currentQuestion.flag.region}</Text>
        )}

        {isHard && (
          <Text style={styles.questionText}>
            {isMapMode ? 'Name this country:' : 'Type the name of this flag:'}
          </Text>
        )}

        {isHard ? (
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.textInput}
              value={textInput}
              onChangeText={setTextInput}
              placeholder="Type your answer..."
              placeholderTextColor={colors.textTertiary}
              autoCapitalize="words"
              autoCorrect={false}
              returnKeyType="done"
              onSubmitEditing={handleSubmitHard}
              editable={!showFeedback}
              accessibilityLabel="Type your answer"
            />
            <TouchableOpacity
              style={[
                styles.submitButton,
                textInput.trim().length === 0 && styles.submitButtonDisabled,
              ]}
              onPress={handleSubmitHard}
              disabled={textInput.trim().length === 0 || showFeedback}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel="Submit answer"
            >
              <Text style={styles.submitButtonText}>Submit</Text>
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
                  accessibilityLabel={isMapMode && optionFlag ? optionFlag.name : option}
                >
                  {isMapMode && optionFlag ? (
                    <FlagImage
                      countryCode={optionFlag.id}
                      size="medium"
                      emoji={optionFlag.emoji}
                    />
                  ) : (
                    <Text style={textStyle}>{option}</Text>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {showFeedback && (
          <View style={styles.feedbackContainer}>
            {lastAnswerCorrect ? (
              <Text style={styles.feedbackCorrect} accessibilityLiveRegion="polite">Correct!</Text>
            ) : (
              <Text style={styles.feedbackWrong} accessibilityLiveRegion="polite">
                It was {currentQuestion.flag.name}
              </Text>
            )}
          </View>
        )}
      </Animated.View>
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
  questionContainer: {
    flex: 1,
    padding: spacing.lg,
    justifyContent: 'center',
  },
  flagContainer: {
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  regionHint: {
    ...typography.captionBold,
    color: colors.textTertiary,
    textAlign: 'center',
    marginBottom: spacing.xs,
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
    paddingVertical: spacing.md,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.border,
  },
  optionButtonMap: {
    padding: spacing.xs,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.white,
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
  textInput: {
    backgroundColor: colors.surface,
    padding: spacing.lg,
    ...typography.body,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
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
