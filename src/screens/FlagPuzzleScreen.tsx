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
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { colors, spacing, typography, fontFamily } from '../utils/theme';
import { GameQuestion, GameResult } from '../types';
import { generateQuestions, checkAnswer } from '../utils/gameEngine';
import { hapticCorrect, hapticWrong, hapticTap, playCorrectSound, playWrongSound } from '../utils/feedback';
import FlagImage from '../components/FlagImage';
import { getAllFlags } from '../data';
import { RootStackParamList } from '../types/navigation';

type Props = NativeStackScreenProps<RootStackParamList, 'FlagPuzzle'>;

const FLAG_WIDTH = 320;
const FLAG_HEIGHT = 213;
const GRID_COLS = 8;
const GRID_ROWS = 6;
const TILE_W = FLAG_WIDTH / GRID_COLS;
const TILE_H = FLAG_HEIGHT / GRID_ROWS;
const TOTAL_TILES = GRID_COLS * GRID_ROWS;

// Generate a shuffled order for revealing tiles
function generateRevealOrder(): number[] {
  const indices = Array.from({ length: TOTAL_TILES }, (_, i) => i);
  for (let i = indices.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [indices[i], indices[j]] = [indices[j], indices[i]];
  }
  return indices;
}

export default function FlagPuzzleScreen({ route, navigation }: Props) {
  const { config } = route.params;
  const timeLimit = config.timeLimit || 30;

  const [questions, setQuestions] = useState<GameQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [results, setResults] = useState<GameResult[]>([]);
  const [textInput, setTextInput] = useState('');
  const [showFeedback, setShowFeedback] = useState(false);
  const [lastAnswerCorrect, setLastAnswerCorrect] = useState(false);
  const [currentStreak, setCurrentStreak] = useState(0);
  const [questionStartTime, setQuestionStartTime] = useState(Date.now());

  // Timer
  const [timeRemaining, setTimeRemaining] = useState(timeLimit);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Reveal state
  const [revealOrder, setRevealOrder] = useState<number[]>(() => generateRevealOrder());
  const [revealedCount, setRevealedCount] = useState(0);
  const revealIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Autocomplete
  const [showSuggestions, setShowSuggestions] = useState(false);
  const allFlagNames = useMemo(() => getAllFlags().map((f) => f.name).sort(), []);

  // Animations
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const streakScale = useRef(new Animated.Value(1)).current;
  const shakeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const q = generateQuestions(config);
    setQuestions(q);
    setQuestionStartTime(Date.now());
  }, []);

  // Start timer and reveal when question loads
  useEffect(() => {
    if (questions.length === 0 || showFeedback) return;

    // Calculate reveal timing: reveal tiles over the full time limit
    // Start at ~10% revealed, end at 100%
    const startRevealCount = Math.floor(TOTAL_TILES * 0.1);
    const remainingTiles = TOTAL_TILES - startRevealCount;
    // Reveal in 10 steps
    const steps = 10;
    const tilesPerStep = Math.ceil(remainingTiles / steps);
    const intervalMs = (timeLimit * 1000) / steps;

    setRevealedCount(startRevealCount);

    revealIntervalRef.current = setInterval(() => {
      setRevealedCount((prev) => {
        const next = Math.min(prev + tilesPerStep, TOTAL_TILES);
        if (next >= TOTAL_TILES && revealIntervalRef.current) {
          clearInterval(revealIntervalRef.current);
        }
        return next;
      });
    }, intervalMs);

    // Countdown timer
    setTimeRemaining(timeLimit);
    timerRef.current = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (revealIntervalRef.current) clearInterval(revealIntervalRef.current);
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [currentIndex, questions.length, showFeedback]);

  // Handle time running out
  useEffect(() => {
    if (timeRemaining === 0 && !showFeedback && questions.length > 0) {
      handleAnswer('');
    }
  }, [timeRemaining]);

  const currentQuestion = questions[currentIndex];
  const progress = questions.length > 0 ? (currentIndex + 1) / questions.length : 0;

  // Compute which tiles are revealed
  const revealedTiles = useMemo(() => {
    const set = new Set<number>();
    for (let i = 0; i < revealedCount; i++) {
      set.add(revealOrder[i]);
    }
    return set;
  }, [revealedCount, revealOrder]);

  // Filter suggestions based on input
  const suggestions = useMemo(() => {
    if (textInput.trim().length < 2) return [];
    const query = textInput.toLowerCase().trim();
    return allFlagNames.filter((name) => name.toLowerCase().startsWith(query)).slice(0, 5);
  }, [textInput, allFlagNames]);

  const animateStreak = () => {
    streakScale.setValue(1.5);
    Animated.spring(streakScale, {
      toValue: 1,
      friction: 3,
      tension: 150,
      useNativeDriver: true,
    }).start();
  };

  const animateWrong = () => {
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 8, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -8, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 50, useNativeDriver: true }),
    ]).start();
  };

  const handleAnswer = useCallback(
    (answer: string) => {
      if (showFeedback) return;

      // Clear timers
      if (timerRef.current) clearInterval(timerRef.current);
      if (revealIntervalRef.current) clearInterval(revealIntervalRef.current);

      hapticTap();
      const correct = answer.length > 0 && checkAnswer(answer, currentQuestion.flag.name);
      const timeTaken = Date.now() - questionStartTime;

      setShowFeedback(true);
      setLastAnswerCorrect(correct);
      // Fully reveal the flag on answer
      setRevealedCount(TOTAL_TILES);

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
        userAnswer: answer || '(time up)',
        correct,
        timeTaken,
      };

      const newResults = [...results, result];

      setTimeout(() => {
        if (currentIndex < questions.length - 1) {
          Animated.sequence([
            Animated.timing(fadeAnim, {
              toValue: 0,
              duration: 150,
              useNativeDriver: true,
            }),
            Animated.timing(fadeAnim, {
              toValue: 1,
              duration: 150,
              useNativeDriver: true,
            }),
          ]).start();

          setResults(newResults);
          setCurrentIndex((i) => i + 1);
          setShowFeedback(false);
          setLastAnswerCorrect(false);
          setTextInput('');
          setShowSuggestions(false);
          setRevealOrder(generateRevealOrder());
          setRevealedCount(0);
          setQuestionStartTime(Date.now());
          Keyboard.dismiss();
        } else {
          navigation.replace('Results', { results: newResults, config });
        }
      }, correct ? 600 : 1200);
    },
    [showFeedback, currentQuestion, questionStartTime, results, currentIndex, questions, fadeAnim, navigation, config],
  );

  const handleSubmit = () => {
    if (textInput.trim().length > 0) {
      handleAnswer(textInput.trim());
    }
  };

  const handleSuggestionSelect = (name: string) => {
    setTextInput(name);
    setShowSuggestions(false);
    Keyboard.dismiss();
    handleAnswer(name);
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

  const timerFraction = timeRemaining / timeLimit;
  const isUrgent = timeRemaining <= 10;

  return (
    <SafeAreaView style={styles.container}>
      {/* Progress bar */}
      <View style={styles.progressBar}>
        <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
      </View>

      {/* Timer bar */}
      <View style={styles.timerBar}>
        <View
          style={[
            styles.timerFill,
            {
              width: `${timerFraction * 100}%`,
              backgroundColor: isUrgent ? colors.error : colors.ink,
            },
          ]}
        />
      </View>

      {/* Top bar */}
      <View style={styles.topBar}>
        <TouchableOpacity
          onPress={() => navigation.popToTop()}
          style={styles.quitButton}
        >
          <Text style={styles.quitText}>Quit</Text>
        </TouchableOpacity>
        <View style={styles.centerInfo}>
          <Text style={styles.counter}>
            {currentIndex + 1} / {questions.length}
          </Text>
          {currentStreak >= 2 ? (
            <Animated.Text
              style={[styles.streakText, { transform: [{ scale: streakScale }] }]}
            >
              {currentStreak}x streak
            </Animated.Text>
          ) : (
            <Text style={styles.score}>
              {results.filter((r) => r.correct).length} correct
            </Text>
          )}
        </View>
        <View style={styles.timerDisplay}>
          <Text style={[styles.timerText, isUrgent && styles.timerTextUrgent]}>
            {timeRemaining}s
          </Text>
        </View>
      </View>

      <Animated.View
        style={[
          styles.questionContainer,
          { opacity: fadeAnim, transform: [{ translateX: shakeAnim }] },
        ]}
      >
        {/* Flag with tile overlay */}
        <View style={styles.flagContainer}>
          <View style={styles.flagWrapper}>
            <FlagImage
              countryCode={currentQuestion.flag.id}
              size="hero"
              emoji={currentQuestion.flag.emoji}
            />
            {/* Tile overlay grid */}
            {!showFeedback && (
              <View style={styles.tileGrid} pointerEvents="none">
                {Array.from({ length: TOTAL_TILES }, (_, i) => {
                  if (revealedTiles.has(i)) return null;
                  const row = Math.floor(i / GRID_COLS);
                  const col = i % GRID_COLS;
                  return (
                    <View
                      key={i}
                      style={[
                        styles.tile,
                        {
                          left: col * TILE_W,
                          top: row * TILE_H,
                          width: TILE_W,
                          height: TILE_H,
                        },
                      ]}
                    />
                  );
                })}
              </View>
            )}
          </View>

          {/* Reveal percentage */}
          <Text style={styles.revealLabel}>
            {Math.round((revealedCount / TOTAL_TILES) * 100)}% revealed
          </Text>
        </View>

        {/* Input area */}
        <View style={styles.inputArea}>
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.textInput}
              value={textInput}
              onChangeText={(text) => {
                setTextInput(text);
                setShowSuggestions(text.trim().length >= 2);
              }}
              placeholder="Type country name..."
              placeholderTextColor={colors.textTertiary}
              autoCapitalize="words"
              autoCorrect={false}
              returnKeyType="done"
              onSubmitEditing={handleSubmit}
              editable={!showFeedback}
            />
            <TouchableOpacity
              style={[
                styles.submitButton,
                textInput.trim().length === 0 && styles.submitButtonDisabled,
              ]}
              onPress={handleSubmit}
              disabled={textInput.trim().length === 0 || showFeedback}
              activeOpacity={0.7}
            >
              <Text style={styles.submitButtonText}>Submit</Text>
            </TouchableOpacity>
          </View>

          {/* Autocomplete suggestions */}
          {showSuggestions && suggestions.length > 0 && !showFeedback && (
            <ScrollView
              style={styles.suggestionsContainer}
              keyboardShouldPersistTaps="handled"
            >
              {suggestions.map((name) => (
                <TouchableOpacity
                  key={name}
                  style={styles.suggestionItem}
                  onPress={() => handleSuggestionSelect(name)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.suggestionText}>{name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}
        </View>

        {/* Feedback */}
        {showFeedback && (
          <View style={styles.feedbackContainer}>
            {lastAnswerCorrect ? (
              <Text style={styles.feedbackCorrect}>Correct!</Text>
            ) : (
              <Text style={styles.feedbackWrong}>
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
    backgroundColor: colors.white,
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
    height: 4,
    backgroundColor: colors.border,
  },
  timerFill: {
    height: '100%',
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  quitButton: {
    padding: spacing.sm,
    width: 60,
  },
  quitText: {
    ...typography.caption,
    color: colors.textTertiary,
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
  timerDisplay: {
    width: 60,
    alignItems: 'flex-end',
  },
  timerText: {
    fontFamily: fontFamily.uiLabel,
    fontSize: 18,
    color: colors.ink,
  },
  timerTextUrgent: {
    color: colors.error,
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
  flagWrapper: {
    width: FLAG_WIDTH,
    height: FLAG_HEIGHT,
    position: 'relative',
  },
  tileGrid: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: FLAG_WIDTH,
    height: FLAG_HEIGHT,
  },
  tile: {
    position: 'absolute',
    backgroundColor: colors.ink,
  },
  revealLabel: {
    ...typography.caption,
    color: colors.textTertiary,
    marginTop: spacing.xs,
  },
  inputArea: {
    position: 'relative',
  },
  inputContainer: {
    gap: spacing.md,
  },
  textInput: {
    backgroundColor: colors.surface,
    padding: spacing.lg,
    ...typography.body,
    color: colors.text,
    borderWidth: 2,
    borderColor: colors.border,
    textAlign: 'center',
  },
  submitButton: {
    backgroundColor: colors.ink,
    padding: spacing.lg,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    backgroundColor: colors.textTertiary,
  },
  submitButtonText: {
    ...typography.bodyBold,
    color: colors.white,
  },
  suggestionsContainer: {
    maxHeight: 200,
    backgroundColor: colors.white,
    borderWidth: 2,
    borderColor: colors.border,
    borderTopWidth: 0,
  },
  suggestionItem: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm + 4,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  suggestionText: {
    ...typography.body,
    color: colors.text,
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
