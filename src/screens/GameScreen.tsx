import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  SafeAreaView,
  Animated,
  Keyboard,
  Platform,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { colors, spacing, borderRadius, typography, shadows } from '../utils/theme';
import { GameQuestion, GameResult } from '../types';
import { generateQuestions, checkAnswer } from '../utils/gameEngine';
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
  const [questionStartTime, setQuestionStartTime] = useState(Date.now());
  const fadeAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const q = generateQuestions(config);
    setQuestions(q);
    setQuestionStartTime(Date.now());
  }, []);

  const currentQuestion = questions[currentIndex];
  const isExtreme = config.difficulty === 'extreme';
  const progress = questions.length > 0 ? (currentIndex + 1) / questions.length : 0;

  const handleAnswer = useCallback(
    (answer: string) => {
      if (showFeedback) return;

      const correct = checkAnswer(answer, currentQuestion.flag.name);
      const timeTaken = Date.now() - questionStartTime;

      setSelectedAnswer(answer);
      setShowFeedback(true);

      const result: GameResult = {
        question: currentQuestion,
        userAnswer: answer,
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
          setSelectedAnswer(null);
          setShowFeedback(false);
          setTextInput('');
          setQuestionStartTime(Date.now());
          Keyboard.dismiss();
        } else {
          navigation.replace('Results', {
            results: newResults,
            config,
          });
        }
      }, correct ? 600 : 1200);
    },
    [showFeedback, currentQuestion, questionStartTime, results, currentIndex, questions, fadeAnim, navigation, config],
  );

  const handleSubmitExtreme = () => {
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
      <View style={styles.topBar}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.quitButton}
        >
          <Text style={styles.quitText}>Quit</Text>
        </TouchableOpacity>
        <Text style={styles.counter}>
          {currentIndex + 1} / {questions.length}
        </Text>
        <Text style={styles.score}>
          {results.filter((r) => r.correct).length} correct
        </Text>
      </View>

      <View style={styles.progressBar}>
        <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
      </View>

      <Animated.View style={[styles.questionContainer, { opacity: fadeAnim }]}>
        <View style={styles.flagContainer}>
          <Text style={styles.flagEmoji}>{currentQuestion.flag.emoji}</Text>
        </View>

        {currentQuestion.flag.category !== 'countries' && (
          <Text style={styles.hint}>
            {currentQuestion.flag.region}
          </Text>
        )}

        <Text style={styles.questionText}>
          {isExtreme ? 'Type the name of this flag:' : 'Which flag is this?'}
        </Text>

        {isExtreme ? (
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
              onSubmitEditing={handleSubmitExtreme}
              editable={!showFeedback}
            />
            <TouchableOpacity
              style={[
                styles.submitButton,
                textInput.trim().length === 0 && styles.submitButtonDisabled,
              ]}
              onPress={handleSubmitExtreme}
              disabled={textInput.trim().length === 0 || showFeedback}
              activeOpacity={0.7}
            >
              <Text style={styles.submitButtonText}>Submit</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.optionsContainer}>
            {currentQuestion.options.map((option, index) => {
              const isSelected = selectedAnswer === option;
              const isCorrect = option === currentQuestion.flag.name;
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
                >
                  <Text style={textStyle}>{option}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {showFeedback && (
          <View style={styles.feedbackContainer}>
            {checkAnswer(selectedAnswer || textInput, currentQuestion.flag.name) ? (
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
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  quitButton: {
    padding: spacing.sm,
  },
  quitText: {
    ...typography.label,
    color: colors.error,
  },
  counter: {
    ...typography.bodyBold,
    color: colors.text,
  },
  score: {
    ...typography.label,
    color: colors.success,
  },
  progressBar: {
    height: 3,
    backgroundColor: colors.border,
    marginHorizontal: spacing.lg,
    borderRadius: 2,
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.accent,
    borderRadius: 2,
  },
  questionContainer: {
    flex: 1,
    padding: spacing.lg,
    justifyContent: 'center',
  },
  flagContainer: {
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  flagEmoji: {
    fontSize: 120,
  },
  hint: {
    ...typography.captionBold,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  questionText: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  optionsContainer: {
    gap: spacing.sm,
  },
  optionButton: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    paddingVertical: spacing.lg,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.border,
    ...shadows.small,
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
  inputContainer: {
    gap: spacing.md,
  },
  textInput: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.lg,
    ...typography.body,
    color: colors.text,
    borderWidth: 2,
    borderColor: colors.border,
    textAlign: 'center',
  },
  submitButton: {
    backgroundColor: colors.accent,
    borderRadius: borderRadius.md,
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
