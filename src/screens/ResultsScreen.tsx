import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Animated,
  Share,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { colors, spacing, typography, fontFamily, buttons, borderRadius } from '../utils/theme';
import { calculateAccuracy, getStreakFromResults, getGrade } from '../utils/gameEngine';
import { updateStats, updateFlagResults } from '../utils/storage';
import { hapticCorrect, playCelebrationSound } from '../utils/feedback';
import { FlagImageSmall } from '../components/FlagImage';
import { CheckIcon, CrossIcon } from '../components/Icons';
import { GAME_MODES, CATEGORIES } from '../types';
import { RootStackParamList } from '../types/navigation';

type Props = NativeStackScreenProps<RootStackParamList, 'Results'>;

export default function ResultsScreen({ route, navigation }: Props) {
  const { results, config } = route.params;
  const correct = results.filter((r) => r.correct).length;
  const accuracy = calculateAccuracy(results);
  const streak = getStreakFromResults(results);
  const grade = getGrade(accuracy);
  const avgTime = results.length > 0
    ? Math.round(results.reduce((sum, r) => sum + r.timeTaken, 0) / results.length / 1000 * 10) / 10
    : 0;
  const isPerfect = accuracy === 100 && results.length > 0;

  const gradeScale = useRef(new Animated.Value(0)).current;
  const confettiOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    updateStats(correct, results.length, streak, config.mode, config.category);
    updateFlagResults(results);

    Animated.spring(gradeScale, {
      toValue: 1,
      friction: 4,
      tension: 80,
      delay: 200,
      useNativeDriver: true,
    }).start();

    if (isPerfect) {
      hapticCorrect();
      playCelebrationSound();
      const loopAnim = Animated.loop(
        Animated.sequence([
          Animated.timing(confettiOpacity, { toValue: 1, duration: 500, useNativeDriver: true }),
          Animated.timing(confettiOpacity, { toValue: 0.3, duration: 500, useNativeDriver: true }),
        ]),
      );
      loopAnim.start();

      return () => {
        loopAnim.stop();
      };
    }
  }, []);

  const categoryLabel = config.category === 'all'
    ? 'All Flags'
    : CATEGORIES.find((c) => c.id === config.category)?.label || '';
  const modeLabel = GAME_MODES[config.mode].label;

  const handleShare = async () => {
    const message =
      `Flag That\n` +
      `${modeLabel} - ${categoryLabel}\n` +
      `Score: ${correct}/${results.length} (${accuracy}%)\n` +
      `Grade: ${grade.label} | Streak: ${streak}\n` +
      (isPerfect ? 'PERFECT SCORE!\n' : '') +
      `Can you beat my score?\n` +
      `https://flagthat.app`;

    try {
      await Share.share({ message });
    } catch {
      // Share cancelled
    }
  };

  const goHome = () => navigation.popToTop();

  const playAgain = () => {
    if (config.mode === 'flagflash') {
      navigation.replace('FlagFlash', { config });
    } else if (config.mode === 'flagpuzzle') {
      navigation.replace('FlagPuzzle', { config });
    } else if (config.mode === 'neighbors') {
      navigation.replace('Neighbors', { config });
    } else if (config.mode === 'impostor') {
      navigation.replace('FlagImpostor', { config });
    } else if (config.mode === 'capitalconnection') {
      navigation.replace('CapitalConnection', { config });
    } else {
      navigation.replace('Game', { config });
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {isPerfect && (
          <Animated.View style={[styles.celebrationBanner, { opacity: confettiOpacity }]}>
            <Text style={styles.celebrationText}>PERFECT SCORE</Text>
          </Animated.View>
        )}

        <Animated.View
          style={[
            styles.gradeContainer,
            { transform: [{ scale: gradeScale }] },
          ]}
        >
          <Text style={[styles.grade, { color: grade.color }]}>{grade.label}</Text>
          <Text style={styles.accuracy}>{accuracy}%</Text>
          <Text style={styles.modeCategoryLabel}>{modeLabel} / {categoryLabel}</Text>
        </Animated.View>

        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{correct}/{results.length}</Text>
            <Text style={styles.statLabel}>Correct</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{streak}</Text>
            <Text style={styles.statLabel}>Best Streak</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{avgTime}s</Text>
            <Text style={styles.statLabel}>Avg Time</Text>
          </View>
        </View>

        {/* Top action buttons */}
        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={handleShare}
            activeOpacity={0.7}
            accessibilityLabel="Share results"
          >
            <Text style={styles.secondaryButtonText}>Share</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={playAgain}
            activeOpacity={0.7}
            accessibilityLabel="Play again"
          >
            <Text style={styles.primaryButtonText}>Play</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={goHome}
            activeOpacity={0.7}
            accessibilityLabel="Go home"
          >
            <Text style={styles.secondaryButtonText}>Home</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.reviewTitle}>Review</Text>
        {results.map((result, index) => (
          <View
            key={index}
            style={[
              styles.reviewItem,
              result.correct ? styles.reviewCorrect : styles.reviewWrong,
            ]}
          >
            <FlagImageSmall
              countryCode={result.question.flag.id}
              emoji={result.question.flag.emoji}
            />
            <View style={styles.reviewContent}>
              <Text style={styles.reviewName}>{result.question.flag.name}</Text>
              {!result.correct && result.userAnswer !== 'SKIPPED' && (
                <Text style={styles.reviewAnswer}>
                  You said: {result.userAnswer}
                </Text>
              )}
              {result.userAnswer === 'SKIPPED' && (
                <Text style={styles.reviewAnswer}>Skipped</Text>
              )}
            </View>
            {result.correct ? <CheckIcon size={20} color={colors.success} /> : <CrossIcon size={20} color={colors.error} />}
          </View>
        ))}

        {/* Bottom action buttons (mirrored) */}
        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={handleShare}
            activeOpacity={0.7}
            accessibilityLabel="Share results"
          >
            <Text style={styles.secondaryButtonText}>Share</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={playAgain}
            activeOpacity={0.7}
            accessibilityLabel="Play again"
          >
            <Text style={styles.primaryButtonText}>Play</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={goHome}
            activeOpacity={0.7}
            accessibilityLabel="Go home"
          >
            <Text style={styles.secondaryButtonText}>Home</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  celebrationBanner: {
    backgroundColor: colors.warning,
    padding: spacing.md,
    alignItems: 'center',
    marginBottom: spacing.md,
    borderRadius: borderRadius.md,
  },
  celebrationText: {
    ...typography.headingUpper,
    color: colors.primary,
  },
  gradeContainer: {
    alignItems: 'center',
    marginVertical: spacing.lg,
  },
  grade: {
    fontSize: 72,
    fontFamily: fontFamily.display,
    letterSpacing: -1,
  },
  accuracy: {
    ...typography.title,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  modeCategoryLabel: {
    ...typography.caption,
    color: colors.textTertiary,
    marginTop: spacing.xs,
  },
  statsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.surface,
    padding: spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
  },
  statValue: {
    ...typography.heading,
    color: colors.text,
  },
  statLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  reviewTitle: {
    ...typography.headingUpper,
    color: colors.text,
    marginBottom: spacing.md,
  },
  reviewItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderLeftWidth: 4,
    borderRadius: borderRadius.md,
    gap: spacing.md,
  },
  reviewCorrect: {
    borderLeftColor: colors.success,
  },
  reviewWrong: {
    borderLeftColor: colors.error,
  },
  reviewContent: {
    flex: 1,
  },
  reviewName: {
    ...typography.bodyBold,
    color: colors.text,
  },
  reviewAnswer: {
    ...typography.caption,
    color: colors.error,
    marginTop: spacing.xxs,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginVertical: spacing.lg,
  },
  secondaryButton: {
    ...buttons.secondary,
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  secondaryButtonText: {
    ...buttons.secondaryText,
    textAlign: 'center',
  },
  primaryButton: {
    ...buttons.primary,
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  primaryButtonText: {
    ...buttons.primaryText,
    textAlign: 'center',
  },
});
