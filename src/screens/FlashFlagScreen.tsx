import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
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
import { spacing, typography, fontFamily, fontSize, buildButtons, borderRadius, ThemeColors } from '../utils/theme';
import { useTheme } from '../contexts/ThemeContext';
import { countCorrect } from '../utils/gameHelpers';
import { t } from '../utils/i18n';
import { CrossIcon } from '../components/Icons';
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

type Props = NativeStackScreenProps<RootStackParamList, 'FlashFlag'>;

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

export default function FlashFlagScreen({ route, navigation }: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { config } = route.params;
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

      // Keep feedback brief so the game stays fast-paced.
      // 500ms flash (enough to register green/red), then 200ms cooldown
      // before the next flag to prevent accidental double-tilts.
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
        }, 200);
      }, 500);
    },
    [currentIndex, questions, navigation, config],
  );

  const currentQuestion = questions[currentIndex] ?? null;
  const correctCount = React.useMemo(
    () => countCorrect(results),
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
        <Text style={styles.tutorialTitle}>{t('flashFlag.title')}</Text>
        <Text style={styles.tutorialSubtitle}>{t('flashFlag.howToPlay')}</Text>

        <View style={styles.tutorialSteps}>
          {showTiltTutorial ? (
            <>
              <View style={styles.tutorialStep}>
                <View style={styles.stepIconBox}>
                  <Text style={styles.stepIconText}>1</Text>
                </View>
                <Text style={styles.stepText}>{t('flashFlag.holdPhone')}</Text>
              </View>
              <View style={styles.tutorialStep}>
                <View style={styles.stepIconBox}>
                  <Text style={styles.stepIconText}>2</Text>
                </View>
                <Text style={styles.stepText}>{t('flashFlag.friendsDescribe')}</Text>
              </View>
              <View style={styles.tutorialStep}>
                <View style={[styles.tiltDemo, { backgroundColor: colors.success }]}>
                  <Text style={styles.tiltDemoText}>{t('flashFlag.tiltDown')}</Text>
                </View>
                <Text style={styles.stepText}>{t('flashFlag.gotItRight')}</Text>
              </View>
              <View style={styles.tutorialStep}>
                <View style={[styles.tiltDemo, { backgroundColor: colors.error }]}>
                  <Text style={styles.tiltDemoText}>{t('flashFlag.tiltUp')}</Text>
                </View>
                <Text style={styles.stepText}>{t('flashFlag.skipPass')}</Text>
              </View>
              {isMobileWeb && (
                <Text style={styles.tiltFallbackNote}>
                  {t('flashFlag.motionFallback')}
                </Text>
              )}
            </>
          ) : (
            <>
              <View style={styles.tutorialStep}>
                <View style={styles.stepIconBox}>
                  <Text style={styles.stepIconText}>?</Text>
                </View>
                <Text style={styles.stepText}>{t('flashFlag.flagAppears')}</Text>
              </View>
              <View style={styles.tutorialStep}>
                <View style={[styles.tiltDemo, { backgroundColor: colors.success }]}>
                  <Text style={styles.tiltDemoText}>{t('flashFlag.correctLabel')}</Text>
                </View>
                <Text style={styles.stepText}>{t('flashFlag.clickLeft')}</Text>
              </View>
              <View style={styles.tutorialStep}>
                <View style={[styles.tiltDemo, { backgroundColor: colors.error }]}>
                  <Text style={styles.tiltDemoText}>{t('flashFlag.skipLabel')}</Text>
                </View>
                <Text style={styles.stepText}>{t('flashFlag.clickRight')}</Text>
              </View>
            </>
          )}
        </View>

        <TouchableOpacity
          style={styles.readyButton}
          onPress={handleReady}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel={t('flashFlag.ready')}
          accessibilityHint={t('a11y.startsFlashFlag')}
        >
          <Text style={styles.readyButtonText}>{t('flashFlag.ready')}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.exitButton}
          onPress={goHome}
          activeOpacity={0.7}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          accessibilityRole="button"
          accessibilityLabel={t('common.exit')}
        >
          <CrossIcon size={20} color={colors.whiteAlpha50} />
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
          {isWeb && !isMobileWeb ? t('flashFlag.getReady') : t('flashFlag.holdForehead')}
        </Text>
        <Text style={styles.countdownNumber}>{countdown}</Text>
      </View>
    );
  }

  if (questions.length === 0) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <StatusBar hidden />
        <ActivityIndicator size="large" color={colors.text} />
      </View>
    );
  }

  const isNeutral = tiltState === 'neutral';
  const bgColor =
    tiltState === 'correct'
      ? colors.success
      : tiltState === 'skip'
        ? colors.error
        : colors.background;

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
              backgroundColor: timeLeft <= 10 ? colors.error : colors.goldBright,
            },
          ]}
        />
      </View>

      <ScreenContainer flex game>
      <View style={styles.gameContent}>
        {tiltState === 'correct' ? (
          <Text style={styles.feedbackText} accessibilityLiveRegion="polite">{t('flashFlag.correctFeedback')}</Text>
        ) : tiltState === 'skip' ? (
          <Text style={styles.feedbackText} accessibilityLiveRegion="polite">{t('flashFlag.passFeedback')}</Text>
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
              />
            )}
            {/* On native/mobile, teammates see the screen from across the room
                during Heads Up play. Hide the country name so they must describe
                the flag visually instead of reading the answer. Desktop web shows
                it as a self-grading flash card. */}
            {isWeb && !isMobileWeb && (
              <Text style={styles.flagName}>{flagName(currentQuestion.flag)}</Text>
            )}
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
            accessibilityRole="button"
            accessibilityLabel={t('flashFlag.correctButton')}
            accessibilityHint={t('a11y.markCorrect')}
          >
            <Text style={styles.webButtonText}>{t('flashFlag.correctButton')}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.webButton, styles.webButtonSkip]}
            onPress={() => handleTilt('skip')}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel={t('flashFlag.skipButton')}
            accessibilityHint={t('a11y.skipFlag')}
          >
            <Text style={styles.webButtonText}>{t('flashFlag.skipButton')}</Text>
          </TouchableOpacity>
        </View>
      )}

      </ScreenContainer>

      <View style={styles.bottomBar}>
        <Text style={[styles.timerText, timeLeft <= 10 && { color: colors.warning }, !isNeutral && { color: colors.white }]}>
          {timeLeft}s
        </Text>
        <TouchableOpacity
          style={styles.exitButtonPlaying}
          onPress={exitGame}
          activeOpacity={0.7}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityRole="button"
          accessibilityLabel={t('common.exit')}
          accessibilityHint={t('a11y.endsGame')}
        >
          <CrossIcon size={18} color={isNeutral ? colors.whiteAlpha70 : colors.white} />
        </TouchableOpacity>
        <Text style={[styles.scoreText, !isNeutral && { color: colors.white }]}>{t('flashFlag.correctCount', { count: correctCount })}</Text>
      </View>
    </View>
  );
}

const createStyles = (colors: ThemeColors) => {
  const btn = buildButtons(colors);
  return StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  // Tutorial
  tutorialContainer: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  tutorialInner: {
    alignItems: 'center',
  },
  tutorialTitle: {
    fontSize: fontSize.display,
    fontFamily: fontFamily.display,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  tutorialSubtitle: {
    ...typography.body,
    color: colors.textSecondary,
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
    color: colors.text,
  },
  stepText: {
    ...typography.body,
    color: colors.text,
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
    color: colors.textTertiary,
    textAlign: 'center',
    marginTop: spacing.xs,
  },
  readyButton: {
    ...btn.primary,
    backgroundColor: colors.accent,
    paddingHorizontal: spacing.xxl,
  },
  readyButtonText: {
    ...btn.primaryText,
  },
  // Countdown
  countdownContainer: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  countdownHint: {
    ...typography.heading,
    color: colors.textSecondary,
    marginBottom: spacing.xl,
  },
  countdownNumber: {
    fontSize: fontSize.countdown,
    fontFamily: fontFamily.display,
    color: colors.text,
  },
  // Playing
  loadingText: {
    ...typography.body,
    color: colors.text,
    textAlign: 'center',
    marginTop: '45%',
  },
  timerBar: {
    height: 6,
    backgroundColor: colors.whiteAlpha20,
  },
  timerFill: {
    height: '100%',
    backgroundColor: colors.goldBright,
  },
  gameContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  flagName: {
    fontSize: fontSize.display,
    fontFamily: fontFamily.display,
    color: colors.text,
    textAlign: 'center',
    letterSpacing: -0.5,
    marginTop: spacing.md,
  },
  feedbackText: {
    fontSize: fontSize.hero,
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
  bottomBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
  },
  timerText: {
    fontSize: fontSize.title,
    fontFamily: fontFamily.display,
    color: colors.text,
  },
  scoreText: {
    ...typography.heading,
    color: colors.textSecondary,
  },
  exitButton: {
    marginTop: spacing.lg,
    padding: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  exitButtonPlaying: {
    padding: spacing.sm,
    backgroundColor: colors.whiteAlpha15,
    borderRadius: borderRadius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  });
};
