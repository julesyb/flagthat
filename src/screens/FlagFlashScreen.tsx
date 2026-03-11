import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { colors, spacing, typography, fontFamily, fontSize, buttons, borderRadius, nav } from '../utils/theme';
import { GameQuestion, GameResult } from '../types';
import { generateQuestions } from '../utils/gameEngine';
import {
  hapticCorrect,
  hapticWrong,
  hapticHeavy,
  playWrongSound,
  playCountdownBeep,
  playGameStartSound,
} from '../utils/feedback';
import FlagImage from '../components/FlagImage';
import { flagName } from '../data/countryNames';
import MapImage from '../components/MapImage';
import { RootStackParamList } from '../types/navigation';
import ScreenContainer from '../components/ScreenContainer';
import { useLayout } from '../utils/useLayout';

type Props = NativeStackScreenProps<RootStackParamList, 'FlagFlash'>;

type TiltState = 'neutral' | 'correct' | 'skip';
type Phase = 'tutorial' | 'countdown' | 'playing';

const isWeb = Platform.OS === 'web';

// Detect mobile web (phone browser) vs desktop web
function getIsMobileWeb(): boolean {
  if (!isWeb) return false;
  if (typeof navigator === 'undefined') return false;
  return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
}

const isMobileWeb = getIsMobileWeb();

// Request DeviceMotion permission on iOS 13+ (required for tilt on mobile Safari)
async function requestMotionPermission(): Promise<boolean> {
  if (typeof DeviceMotionEvent === 'undefined') return false;
  const DME = DeviceMotionEvent as unknown as {
    requestPermission?: () => Promise<'granted' | 'denied'>;
  };
  if (typeof DME.requestPermission === 'function') {
    try {
      const result = await DME.requestPermission();
      return result === 'granted';
    } catch {
      return false;
    }
  }
  // Android Chrome and older iOS don't need permission
  return true;
}

export default function FlagFlashScreen({ route, navigation }: Props) {
  const { config } = route.params;
  const { isDesktop } = useLayout();
  const [questions, setQuestions] = useState<GameQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [results, setResults] = useState<GameResult[]>([]);
  const [timeLeft, setTimeLeft] = useState(config.timeLimit || 60);
  const [tiltState, setTiltState] = useState<TiltState>('neutral');
  const [phase, setPhase] = useState<Phase>('tutorial');
  const [countdown, setCountdown] = useState(3);
  const [motionGranted, setMotionGranted] = useState(false);
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
  }, [config]);

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

  // Mobile web tilt detection via DeviceMotion API
  // Uses z-axis (perpendicular to screen) to match native behavior.
  // Phone on forehead, screen outward: z ~ 0 at rest.
  // Tilt forward (nod, screen faces ground): z goes negative.
  // Tilt backward (look up, screen faces sky): z goes positive.
  // Thresholds ±6 m/s^2 match native ±0.6g (expo-sensors normalizes to 0-1).
  useEffect(() => {
    if (!isMobileWeb) return;
    if (phase !== 'playing') return;
    if (!motionGranted) return;

    const handleMotion = (e: DeviceMotionEvent) => {
      if (isProcessing.current || tiltCooldown.current) return;
      const acc = e.accelerationIncludingGravity;
      if (!acc || acc.z == null) return;

      const z = acc.z;

      if (z < -6) {
        handleTilt('correct'); // Screen facing ground (nod forward)
      } else if (z > 6) {
        handleTilt('skip'); // Screen facing sky (lean back)
      }
    };

    window.addEventListener('devicemotion', handleMotion as EventListener);
    return () => window.removeEventListener('devicemotion', handleMotion as EventListener);
  }, [phase, currentIndex, questions, motionGranted]);

  // Web keyboard controls (desktop web fallback)
  useEffect(() => {
    if (!isWeb) return;
    if (phase !== 'playing') return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        exitGame();
        return;
      }
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

  const currentQuestion = questions[currentIndex] ?? null;
  const correctCount = React.useMemo(
    () => results.filter((r) => r.correct).length,
    [results],
  );

  const exitGame = () => {
    navigation.replace('Results', { results: resultsRef.current, config });
  };

  const goHome = () => {
    navigation.navigate('Home');
  };

  const handleReady = useCallback(async () => {
    if (isMobileWeb) {
      const granted = await requestMotionPermission();
      setMotionGranted(granted);
      if (!granted) {
        // Tilt unavailable - skip straight to playing with button controls.
        // No countdown needed since phone won't be on forehead.
        const q = questions.length > 0 ? questions : generateQuestions(config);
        if (questions.length === 0) setQuestions(q);
        playGameStartSound();
        setPhase('playing');
        questionStartTime.current = Date.now();
        return;
      }
    }
    setPhase('countdown');
  }, [questions, config]);

  // Tutorial screen
  if (phase === 'tutorial') {
    // Native always uses tilt. Desktop web uses buttons/keyboard.
    // Mobile web shows tilt instructions but notes button fallback
    // in case motion permission is denied.
    const showTiltTutorial = !isWeb || isMobileWeb;

    return (
      <View style={styles.tutorialContainer}>
        <StatusBar hidden />
        <ScreenContainer>
        <View style={styles.tutorialInner}>
        <Text style={styles.tutorialTitle}>FlagFlash</Text>
        <Text style={styles.tutorialSubtitle}>How to play</Text>

        <View style={styles.tutorialSteps}>
          {showTiltTutorial ? (
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
              {isMobileWeb && (
                <Text style={styles.tiltFallbackNote}>
                  If motion is unavailable, tap buttons instead
                </Text>
              )}
            </>
          ) : (
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
                <View style={{ flex: 1 }}>
                  <Text style={styles.stepText}>Click or press Left/Down arrow</Text>
                </View>
              </View>
              <View style={styles.tutorialStep}>
                <View style={[styles.tiltDemo, { backgroundColor: colors.error }]}>
                  <Text style={styles.tiltDemoText}>SKIP</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.stepText}>Click or press Right/Up arrow</Text>
                </View>
              </View>
              <View style={styles.keyboardHintRow}>
                <View style={styles.keyBadge}><Text style={styles.keyBadgeText}>←</Text></View>
                <Text style={styles.keyHintLabel}>Correct</Text>
                <View style={{ width: spacing.lg }} />
                <View style={styles.keyBadge}><Text style={styles.keyBadgeText}>→</Text></View>
                <Text style={styles.keyHintLabel}>Skip</Text>
              </View>
            </>
          )}
        </View>

        <TouchableOpacity
          style={styles.readyButton}
          onPress={handleReady}
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
        </ScreenContainer>
      </View>
    );
  }

  // Countdown screen
  if (phase === 'countdown') {
    return (
      <View style={styles.countdownContainer}>
        <StatusBar hidden />
        <Text style={styles.countdownHint}>
          {isWeb && !isMobileWeb ? 'Get ready...' : 'Hold phone on forehead'}
        </Text>
        <Text style={styles.countdownNumber}>{countdown}</Text>
      </View>
    );
  }

  if (questions.length === 0) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <StatusBar hidden />
        <ActivityIndicator size="large" color={colors.white} />
      </View>
    );
  }

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

      <ScreenContainer flex game>
      <View style={styles.gameContent}>
        {tiltState === 'correct' ? (
          <Text style={styles.feedbackText}>CORRECT!</Text>
        ) : tiltState === 'skip' ? (
          <Text style={styles.feedbackText}>PASS</Text>
        ) : (
          <>
            {config.displayMode === 'map' ? (
              <MapImage
                countryCode={currentQuestion.flag.id}
                size="hero"
              />
            ) : (
              <FlagImage
                countryCode={currentQuestion.flag.id}
                size="hero"
                emoji={currentQuestion.flag.emoji}
              />
            )}
            <Text style={styles.flagName}>{flagName(currentQuestion.flag)}</Text>
          </>
        )}
      </View>

      {/* Web button controls */}
      {isWeb && tiltState === 'neutral' && (
        <View style={[styles.webControls, isDesktop && styles.webControlsDesktop]}>
          <TouchableOpacity
            style={[styles.webButton, styles.webButtonCorrect]}
            onPress={() => handleTilt('correct')}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Correct"
          >
            <Text style={styles.webButtonText}>Correct</Text>
            {isDesktop && <Text style={styles.webKeyHint}>← / ↓</Text>}
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.webButton, styles.webButtonSkip]}
            onPress={() => handleTilt('skip')}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Skip"
          >
            <Text style={styles.webButtonText}>Skip</Text>
            {isDesktop && <Text style={styles.webKeyHint}>→ / ↑</Text>}
          </TouchableOpacity>
        </View>
      )}

      </ScreenContainer>

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
  tutorialInner: {
    alignItems: 'center',
  },
  tutorialTitle: {
    fontSize: fontSize.gameTitle,
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
    borderRadius: borderRadius.sm,
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
    borderRadius: borderRadius.sm,
  },
  tiltDemoText: {
    ...typography.captionBold,
    color: colors.white,
  },
  tiltFallbackNote: {
    ...typography.caption,
    color: colors.whiteAlpha45,
    textAlign: 'center',
    marginTop: spacing.xs,
  },
  readyButton: {
    ...buttons.primary,
    backgroundColor: colors.accent,
    paddingHorizontal: spacing.xxl,
  },
  readyButtonText: {
    ...buttons.primaryText,
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
    fontSize: fontSize.countdown,
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
    fontSize: fontSize.gameTitle,
    fontFamily: fontFamily.display,
    color: colors.white,
    textAlign: 'center',
    letterSpacing: -0.5,
    marginTop: spacing.md,
  },
  feedbackText: {
    fontSize: fontSize.gameFeedback,
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
  webControlsDesktop: {
    gap: spacing.xl,
  },
  webButton: {
    flex: 1,
    maxWidth: 200,
    paddingVertical: spacing.md,
    alignItems: 'center',
    borderRadius: borderRadius.md,
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
  webKeyHint: {
    fontFamily: fontFamily.uiLabel,
    fontSize: fontSize.sm,
    color: colors.whiteAlpha60,
    marginTop: spacing.xxs,
  },
  // Keyboard hint row (desktop tutorial)
  keyboardHintRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.sm,
    gap: spacing.sm,
  },
  keyBadge: {
    width: 32,
    height: 28,
    backgroundColor: colors.whiteAlpha15,
    borderRadius: borderRadius.sm,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.whiteAlpha20,
  },
  keyBadgeText: {
    fontFamily: fontFamily.uiLabel,
    fontSize: fontSize.body,
    color: colors.white,
  },
  keyHintLabel: {
    fontFamily: fontFamily.body,
    fontSize: fontSize.caption,
    color: colors.whiteAlpha60,
  },
  bottomBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xl,
  },
  timerText: {
    fontSize: fontSize.title,
    fontFamily: fontFamily.display,
    color: colors.white,
  },
  scoreText: {
    ...typography.heading,
    color: colors.whiteAlpha70,
  },
  exitButton: {
    marginTop: spacing.lg,
    padding: spacing.sm,
  },
  exitButtonText: {
    ...nav.backText,
    color: colors.whiteAlpha50,
  },
  exitButtonPlaying: {
    padding: spacing.sm,
    backgroundColor: colors.whiteAlpha15,
    borderRadius: borderRadius.sm,
  },
  exitButtonPlayingText: {
    ...nav.backText,
    color: colors.whiteAlpha70,
  },
});
