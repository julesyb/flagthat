import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { colors, spacing, typography, fontFamily } from '../utils/theme';
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

const isWeb = Platform.OS === 'web';

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

  useEffect(() => {
    resultsRef.current = results;
  }, [results]);

  // Lock to landscape (native only)
  useEffect(() => {
    if (isWeb) return;

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const SO = require('expo-screen-orientation') as typeof import('expo-screen-orientation');
    try {
      SO.lockAsync(SO.OrientationLock.LANDSCAPE_RIGHT);
    } catch {
      // Screen orientation not available
    }
    return () => {
      try {
        SO.lockAsync(SO.OrientationLock.PORTRAIT_UP);
      } catch {
        // Ignore cleanup errors
      }
    };
  }, []);

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

  // Accelerometer for tilt detection (native only)
  useEffect(() => {
    if (isWeb) return;
    if (phase !== 'playing') return;

    let subscription: { remove: () => void } | null = null;
    try {
      const { Accelerometer } = require('expo-sensors');
      Accelerometer.setUpdateInterval(100);

      subscription = Accelerometer.addListener(({ z }: { z: number }) => {
        if (isProcessing.current || tiltCooldown.current) return;

        if (z < -0.6) {
          handleTilt('correct');
        } else if (z > 0.6) {
          handleTilt('skip');
        }
      });
    } catch {
      // Accelerometer not available
    }

    return () => {
      if (subscription) subscription.remove();
    };
  }, [phase, currentIndex, questions]);

  // Web keyboard controls
  useEffect(() => {
    if (!isWeb) return;
    if (phase !== 'playing') return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
        e.preventDefault();
        handleTilt('correct');
      } else if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
        e.preventDefault();
        handleTilt('skip');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
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

  const exitGame = () => {
    navigation.replace('Results', { results: resultsRef.current, config });
  };

  const goHome = () => {
    navigation.navigate('Home');
  };

  // Tutorial screen
  if (phase === 'tutorial') {
    return (
      <View style={styles.tutorialContainer}>
        <StatusBar hidden />
        <Text style={styles.tutorialTitle}>Heads Up!</Text>
        <Text style={styles.tutorialSubtitle}>How to play</Text>

        <View style={styles.tutorialSteps}>
          {isWeb ? (
            <>
              <View style={styles.tutorialStep}>
                <View style={styles.stepIconBox}>
                  <Text style={styles.stepIconText}>?</Text>
                </View>
                <Text style={styles.stepText}>A flag name appears on screen</Text>
              </View>
              <View style={styles.tutorialStep}>
                <View style={[styles.tiltDemo, { backgroundColor: colors.success }]}>
                  <Text style={styles.tiltDemoText}>CORRECT</Text>
                </View>
                <Text style={styles.stepText}>Click or press Left arrow</Text>
              </View>
              <View style={styles.tutorialStep}>
                <View style={[styles.tiltDemo, { backgroundColor: colors.error }]}>
                  <Text style={styles.tiltDemoText}>SKIP</Text>
                </View>
                <Text style={styles.stepText}>Click or press Right arrow</Text>
              </View>
            </>
          ) : (
            <>
              <View style={styles.tutorialStep}>
                <View style={styles.stepIconBox}>
                  <Text style={styles.stepIconText}>1</Text>
                </View>
                <Text style={styles.stepText}>Hold phone on your forehead</Text>
              </View>
              <View style={styles.tutorialStep}>
                <View style={styles.stepIconBox}>
                  <Text style={styles.stepIconText}>2</Text>
                </View>
                <Text style={styles.stepText}>Friends describe the flag to you</Text>
              </View>
              <View style={styles.tutorialStep}>
                <View style={[styles.tiltDemo, { backgroundColor: colors.success }]}>
                  <Text style={styles.tiltDemoText}>TILT DOWN</Text>
                </View>
                <Text style={styles.stepText}>Got it right!</Text>
              </View>
              <View style={styles.tutorialStep}>
                <View style={[styles.tiltDemo, { backgroundColor: colors.error }]}>
                  <Text style={styles.tiltDemoText}>TILT UP</Text>
                </View>
                <Text style={styles.stepText}>Skip / Pass</Text>
              </View>
            </>
          )}
        </View>

        <TouchableOpacity
          style={styles.readyButton}
          onPress={() => setPhase('countdown')}
          activeOpacity={0.8}
        >
          <Text style={styles.readyButtonText}>Ready!</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.exitButton}
          onPress={goHome}
          activeOpacity={0.7}
        >
          <Text style={styles.exitButtonText}>Exit</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Countdown screen
  if (phase === 'countdown') {
    return (
      <View style={styles.countdownContainer}>
        <StatusBar hidden />
        <Text style={styles.countdownHint}>
          {isWeb ? 'Get ready...' : 'Hold phone on forehead'}
        </Text>
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

      {/* Web button controls */}
      {isWeb && tiltState === 'neutral' && (
        <View style={styles.webControls}>
          <TouchableOpacity
            style={[styles.webButton, styles.webButtonCorrect]}
            onPress={() => handleTilt('correct')}
            activeOpacity={0.7}
          >
            <Text style={styles.webButtonText}>Correct</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.webButton, styles.webButtonSkip]}
            onPress={() => handleTilt('skip')}
            activeOpacity={0.7}
          >
            <Text style={styles.webButtonText}>Skip</Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.bottomBar}>
        <Text style={[styles.timerText, timeLeft <= 10 && { color: colors.warning }]}>
          {timeLeft}s
        </Text>
        <TouchableOpacity
          style={styles.exitButtonPlaying}
          onPress={exitGame}
          activeOpacity={0.7}
        >
          <Text style={styles.exitButtonPlayingText}>Exit</Text>
        </TouchableOpacity>
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
    fontFamily: fontFamily.display,
    color: colors.white,
    marginBottom: spacing.xs,
  },
  tutorialSubtitle: {
    ...typography.body,
    color: colors.whiteAlpha50,
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
  stepIconBox: {
    width: 44,
    height: 44,
    backgroundColor: colors.whiteAlpha15,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepIconText: {
    ...typography.bodyBold,
    color: colors.white,
  },
  stepText: {
    ...typography.body,
    color: colors.white,
    flex: 1,
  },
  tiltDemo: {
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
    paddingHorizontal: spacing.xxl,
    paddingVertical: spacing.lg,
  },
  readyButtonText: {
    ...typography.headingUpper,
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
    color: colors.whiteAlpha60,
    marginBottom: spacing.xl,
  },
  countdownNumber: {
    fontSize: 120,
    fontFamily: fontFamily.display,
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
    backgroundColor: colors.whiteAlpha20,
    marginTop: spacing.md + spacing.xs,
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
    fontFamily: fontFamily.display,
    color: colors.white,
    textAlign: 'center',
    letterSpacing: -0.5,
    marginTop: spacing.md,
  },
  flagRegion: {
    ...typography.heading,
    color: colors.whiteAlpha50,
  },
  feedbackText: {
    fontSize: 56,
    fontFamily: fontFamily.display,
    color: colors.white,
    textAlign: 'center',
  },
  // Web controls
  webControls: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.lg,
    paddingHorizontal: spacing.xl,
    marginBottom: spacing.md,
  },
  webButton: {
    flex: 1,
    maxWidth: 200,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  webButtonCorrect: {
    backgroundColor: colors.success,
  },
  webButtonSkip: {
    backgroundColor: colors.error,
  },
  webButtonText: {
    ...typography.bodyBold,
    color: colors.white,
  },
  bottomBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xl,
  },
  timerText: {
    fontSize: 28,
    fontFamily: fontFamily.display,
    color: colors.white,
  },
  scoreText: {
    ...typography.heading,
    color: colors.whiteAlpha70,
  },
  exitButton: {
    marginTop: spacing.lg,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.sm,
  },
  exitButtonText: {
    ...typography.body,
    color: colors.whiteAlpha50,
    textDecorationLine: 'underline',
  },
  exitButtonPlaying: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    backgroundColor: colors.whiteAlpha15,
  },
  exitButtonPlayingText: {
    ...typography.captionBold,
    color: colors.whiteAlpha70,
  },
});
