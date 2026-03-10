import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { colors, spacing, borderRadius, typography, shadows } from '../utils/theme';
import { calculateAccuracy, getStreakFromResults, getGrade } from '../utils/gameEngine';
import { updateStats } from '../utils/storage';
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

  useEffect(() => {
    updateStats(correct, results.length, streak, config.difficulty, config.categories);
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.gradeContainer}>
          <Text style={[styles.grade, { color: grade.color }]}>{grade.label}</Text>
          <Text style={styles.accuracy}>{accuracy}%</Text>
        </View>

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

        <Text style={styles.reviewTitle}>Review</Text>
        {results.map((result, index) => (
          <View
            key={index}
            style={[
              styles.reviewItem,
              result.correct ? styles.reviewCorrect : styles.reviewWrong,
            ]}
          >
            <Text style={styles.reviewEmoji}>{result.question.flag.emoji}</Text>
            <View style={styles.reviewContent}>
              <Text style={styles.reviewName}>{result.question.flag.name}</Text>
              {!result.correct && (
                <Text style={styles.reviewAnswer}>
                  You said: {result.userAnswer}
                </Text>
              )}
            </View>
            <Text style={styles.reviewIcon}>
              {result.correct ? '✓' : '✗'}
            </Text>
          </View>
        ))}

        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => navigation.popToTop()}
            activeOpacity={0.7}
          >
            <Text style={styles.secondaryButtonText}>Home</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => navigation.replace('Game', { config })}
            activeOpacity={0.7}
          >
            <Text style={styles.primaryButtonText}>Play Again</Text>
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
  gradeContainer: {
    alignItems: 'center',
    marginVertical: spacing.xl,
  },
  grade: {
    fontSize: 72,
    fontWeight: '800',
    letterSpacing: -1,
  },
  accuracy: {
    ...typography.title,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  statsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.xl,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    alignItems: 'center',
    ...shadows.small,
  },
  statValue: {
    ...typography.heading,
    color: colors.text,
  },
  statLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 4,
  },
  reviewTitle: {
    ...typography.heading,
    color: colors.text,
    marginBottom: spacing.md,
  },
  reviewItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderLeftWidth: 4,
  },
  reviewCorrect: {
    borderLeftColor: colors.success,
  },
  reviewWrong: {
    borderLeftColor: colors.error,
  },
  reviewEmoji: {
    fontSize: 32,
    marginRight: spacing.md,
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
    marginTop: 2,
  },
  reviewIcon: {
    ...typography.heading,
    color: colors.textTertiary,
    marginLeft: spacing.sm,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.xl,
  },
  secondaryButton: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.border,
  },
  secondaryButtonText: {
    ...typography.bodyBold,
    color: colors.text,
  },
  primaryButton: {
    flex: 1,
    backgroundColor: colors.accent,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    alignItems: 'center',
  },
  primaryButtonText: {
    ...typography.bodyBold,
    color: colors.white,
  },
});
