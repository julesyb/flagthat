import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  TouchableOpacity,
} from 'react-native';
import { Accelerometer } from 'expo-sensors';
import * as ScreenOrientation from 'expo-screen-orientation';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { colors, spacing, borderRadius, typography } from '../utils/theme';
import { GameQuestion, GameResult } from '../types';
import { generateQuestions } from '../utils/gameEngine';
import {
  hapticCorrect,
  hapticWrong,
  hapticHeavy,
  playCorrectSound,
  playWrongSound,
  playCountdownBeep,
  playGameStartSound,
} from '../utils/feedback';
import FlagImage from '../components/FlagImage';
import { RootStackParamList } from '../types/navigation';

type Props = NativeStackScreenProps<RootStackParamList, 'HeadsUp'>;

type TiltState = 'neutral' | 'correct' | 'skip';
type Phase = 'tutorial' | 'countdown' | 'playing';

export default function HeadsUpScreen({ route, navigation }: Props) {
  const { config } = route.params;
  const [questions, setQuestions] = useState<GameQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [results, setResults] = useState<GameResult[]>([]);
  const [timeLeft, setTimeLeft] = useState(config.timeLimit || 60);
  const [tiltState, setTiltState] = useState<TiltState>('neutral');
  const [phase, setPhase] = useState<Phase>('tutorial');
  const [countdown, setCountdown] = useState(3);
  const questionStartTime = useRef(Date.now());
  const isProcessing = useRef(false);
  const tiltCooldown = useRef(false);
  const resultsRef = useRef<GameResult[]>([]);

  // Keep results ref in sync
  useEffect(() => {
    resultsRef.current = results;
  }, [results]);

  // Lock to landscape
  useEffect(() => {
    ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE_RIGHT);
    return () => {
      ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
    };
  }, []);

  // Generate questions
  useEffect(() => {
    const q = generateQuestions(config);
    setQuestions(q);
  }, []);

  // Countdown
  useEffect(() => {
    if (phase !== 'countdown') return;
    if (countdown > 0) {
      playCountdownBeep();
      hapticHeavy();
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else {
      playGameStartSound();
      setPhase('playing');
      questionStartTime.current = Date.now();
    }
  }, [phase, countdown]);

  // Game timer
  useEffect(() => {
    if (phase !== 'playing') return;
    if (timeLeft <= 0) {
      navigation.replace('Results', { results: resultsRef.current, config });
      return;
    }

    const interval = setInterval(() => {
      setTimeLeft((t) => t - 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [phase, timeLeft]);

  // Accelerometer for tilt detection
  useEffect(() => {
    if (phase !== 'playing') return;

    Accelerometer.setUpdateInterval(100);

    const subscription = Accelerometer.addListener(({ z }) => {
      if (isProcessing.current || tiltCooldown.current) return;

      // In landscape, z axis detects tilting phone forward/backward
      if (z < -0.6) {
        handleTilt('correct');
      } else if (z > 0.6) {
        handleTilt('skip');
      }
    });

    return () => subscription.remove();
  }, [phase, currentIndex, questions]);

  const handleTilt = useCallback(
    (action: 'correct' | 'skip') => {
      if (isProcessing.current || tiltCooldown.current) return;
      if (!questions[currentIndex]) return;

      isProcessing.current = true;
      tiltCooldown.current = true;

      const timeTaken = Date.now() - questionStartTime.current;
      const currentQ = questions[currentIndex];

      const result: GameResult = {
        question: currentQ,
        userAnswer: action === 'correct' ? currentQ.flag.name : 'SKIPPED',
        correct: action === 'correct',
        timeTaken,
      };

      if (action === 'correct') {
        hapticCorrect();
        playCorrectSound();
      } else {
        hapticWrong();
        playWrongSound();
      }

      setTiltState(action);
      setResults((prev) => [...prev, result]);

      setTimeout(() => {
        setTiltState('neutral');
        isProcessing.current = false;

        if (currentIndex < questions.length - 1) {
          setCurrentIndex((i) => i + 1);
          questionStartTime.current = Date.now();
        } else {
          navigation.replace('Results', {
            results: [...resultsRef.current, result],
            config,
          });
          return;
        }

        setTimeout(() => {
          tiltCooldown.current = false;
        }, 300);
      }, 800);
    },
    [currentIndex, questions, navigation, config],
  );

  // Tutorial screen
  if (phase === 'tutorial') {
    return (
      <View style={styles.tutorialContainer}>
        <StatusBar hidden />
        <Text style={styles.tutorialTitle}>Heads Up!</Text>
        <Text style={styles.tutorialSubtitle}>How to play</Text>

        <View style={styles.tutorialSteps}>
          <View style={styles.tutorialStep}>
            <Text style={styles.stepIcon}>📱</Text>
            <Text style={styles.stepText}>Hold phone on your forehead</Text>
          </View>
          <View style={styles.tutorialStep}>
            <Text style={styles.stepIcon}>🗣</Text>
            <Text style={styles.stepText}>Friends describe the flag to you</Text>
          </View>
          <View style={styles.tutorialStep}>
            <View style={[styles.tiltDemo, { backgroundColor: colors.success }]}>
              <Text style={styles.tiltDemoText}>⬇ TILT DOWN</Text>
            </View>
            <Text style={styles.stepText}>Got it right!</Text>
          </View>
          <View style={styles.tutorialStep}>
            <View style={[styles.tiltDemo, { backgroundColor: colors.error }]}>
              <Text style={styles.tiltDemoText}>⬆ TILT UP</Text>
            </View>
            <Text style={styles.stepText}>Skip / Pass</Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.readyButton}
          onPress={() => setPhase('countdown')}
          activeOpacity={0.8}
        >
          <Text style={styles.readyButtonText}>Ready!</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Countdown screen
  if (phase === 'countdown') {
    return (
      <View style={styles.countdownContainer}>
        <StatusBar hidden />
        <Text style={styles.countdownHint}>Hold phone on forehead</Text>
        <Text style={styles.countdownNumber}>{countdown}</Text>
      </View>
    );
  }

  if (questions.length === 0) {
    return (
      <View style={styles.container}>
        <StatusBar hidden />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  const currentQuestion = questions[currentIndex];
  const correctCount = results.filter((r) => r.correct).length;

  const bgColor =
    tiltState === 'correct'
      ? colors.success
      : tiltState === 'skip'
        ? colors.error
        : colors.primary;

  return (
    <View style={[styles.container, { backgroundColor: bgColor }]}>
      <StatusBar hidden />

      {/* Timer bar */}
      <View style={styles.timerBar}>
        <View
          style={[
            styles.timerFill,
            {
              width: `${(timeLeft / (config.timeLimit || 60)) * 100}%`,
              backgroundColor: timeLeft <= 10 ? colors.error : colors.white,
            },
          ]}
        />
      </View>

      <View style={styles.gameContent}>
        {tiltState === 'correct' ? (
          <Text style={styles.feedbackText}>CORRECT!</Text>
        ) : tiltState === 'skip' ? (
          <Text style={styles.feedbackText}>PASS</Text>
        ) : (
          <>
            <FlagImage
              countryCode={currentQuestion.flag.id}
              size="hero"
              emoji={currentQuestion.flag.emoji}
            />
            <Text style={styles.flagName}>{currentQuestion.flag.name}</Text>
            <Text style={styles.flagRegion}>{currentQuestion.flag.region}</Text>
          </>
        )}
      </View>

      <View style={styles.bottomBar}>
        <Text style={[styles.timerText, timeLeft <= 10 && { color: '#FFD700' }]}>
          {timeLeft}s
        </Text>
        <Text style={styles.scoreText}>{correctCount} correct</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.primary,
  },
  // Tutorial
  tutorialContainer: {
    flex: 1,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  tutorialTitle: {
    fontSize: 42,
    fontWeight: '800',
    color: colors.white,
    marginBottom: spacing.xs,
  },
  tutorialSubtitle: {
    ...typography.body,
    color: 'rgba(255,255,255,0.5)',
    marginBottom: spacing.xl,
  },
  tutorialSteps: {
    gap: spacing.lg,
    marginBottom: spacing.xl,
    width: '100%',
    maxWidth: 400,
  },
  tutorialStep: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  stepIcon: {
    fontSize: 32,
    width: 44,
    textAlign: 'center',
  },
  stepText: {
    ...typography.body,
    color: colors.white,
    flex: 1,
  },
  tiltDemo: {
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    width: 140,
    alignItems: 'center',
  },
  tiltDemoText: {
    ...typography.captionBold,
    color: colors.white,
  },
  readyButton: {
    backgroundColor: colors.accent,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.xxl,
    paddingVertical: spacing.lg,
  },
  readyButtonText: {
    ...typography.heading,
    color: colors.white,
  },
  // Countdown
  countdownContainer: {
    flex: 1,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  countdownHint: {
    ...typography.heading,
    color: 'rgba(255,255,255,0.6)',
    marginBottom: spacing.xl,
  },
  countdownNumber: {
    fontSize: 120,
    fontWeight: '800',
    color: colors.white,
  },
  // Playing
  loadingText: {
    ...typography.body,
    color: colors.white,
    textAlign: 'center',
    marginTop: '45%',
  },
  timerBar: {
    height: 6,
    backgroundColor: 'rgba(255,255,255,0.2)',
    marginTop: 20,
  },
  timerFill: {
    height: '100%',
    backgroundColor: colors.white,
  },
  gameContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
    gap: spacing.md,
  },
  flagName: {
    fontSize: 42,
    fontWeight: '800',
    color: colors.white,
    textAlign: 'center',
    letterSpacing: -0.5,
    marginTop: spacing.md,
  },
  flagRegion: {
    ...typography.heading,
    color: 'rgba(255,255,255,0.5)',
  },
  feedbackText: {
    fontSize: 56,
    fontWeight: '800',
    color: colors.white,
    textAlign: 'center',
  },
  bottomBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingBottom: 30,
  },
  timerText: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.white,
  },
  scoreText: {
    ...typography.heading,
    color: 'rgba(255,255,255,0.7)',
  },
});
