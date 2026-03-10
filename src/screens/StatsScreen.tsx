import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Alert,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { colors, spacing, borderRadius, typography, fontFamily } from '../utils/theme';
import { UserStats, GAME_MODES, CATEGORIES, GameMode } from '../types';
import { getStats, resetStats } from '../utils/storage';

export default function StatsScreen() {
  const [stats, setStats] = useState<UserStats | null>(null);

  useFocusEffect(
    useCallback(() => {
      getStats().then(setStats);
    }, []),
  );

  const handleReset = () => {
    Alert.alert(
      'Reset Statistics',
      'Are you sure? This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            await resetStats();
            getStats().then(setStats);
          },
        },
      ],
    );
  };

  if (!stats) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const overallAccuracy =
    stats.totalAnswered > 0
      ? Math.round((stats.totalCorrect / stats.totalAnswered) * 100)
      : 0;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.overviewSection}>
          <View style={styles.bigStatCard}>
            <Text style={styles.bigStatValue}>{stats.totalGamesPlayed}</Text>
            <Text style={styles.bigStatLabel}>Games Played</Text>
          </View>
          <View style={styles.rowStats}>
            <View style={styles.smallStatCard}>
              <Text style={styles.smallStatValue}>{overallAccuracy}%</Text>
              <Text style={styles.smallStatLabel}>Accuracy</Text>
            </View>
            <View style={styles.smallStatCard}>
              <Text style={styles.smallStatValue}>{stats.bestStreak}</Text>
              <Text style={styles.smallStatLabel}>Best Streak</Text>
            </View>
            <View style={styles.smallStatCard}>
              <Text style={styles.smallStatValue}>{stats.totalCorrect}</Text>
              <Text style={styles.smallStatLabel}>Correct</Text>
            </View>
          </View>
        </View>

        <Text style={styles.sectionTitle}>By Mode</Text>
        {(Object.keys(GAME_MODES) as GameMode[]).map((m) => {
          const s = stats.modeStats[m];
          const acc = s.total > 0 ? Math.round((s.correct / s.total) * 100) : 0;
          return (
            <View key={m} style={styles.statRow}>
              <Text style={styles.statRowLabel}>{GAME_MODES[m].label}</Text>
              <View style={styles.statBarContainer}>
                <View style={[styles.statBar, { width: `${acc}%` }]} />
              </View>
              <Text style={styles.statRowValue}>
                {s.total > 0 ? `${acc}%` : '\u2014'}
              </Text>
            </View>
          );
        })}

        <Text style={styles.sectionTitle}>By Category</Text>
        {CATEGORIES.map((cat) => {
          const s = stats.categoryStats[cat.id];
          const acc = s && s.total > 0 ? Math.round((s.correct / s.total) * 100) : 0;
          return (
            <View key={cat.id} style={styles.statRow}>
              <Text style={styles.statRowLabel}>{cat.label}</Text>
              <View style={styles.statBarContainer}>
                <View style={[styles.statBar, { width: `${acc}%` }]} />
              </View>
              <Text style={styles.statRowValue}>
                {s && s.total > 0 ? `${acc}%` : '\u2014'}
              </Text>
            </View>
          );
        })}

        <TouchableOpacity
          style={styles.resetButton}
          onPress={handleReset}
          activeOpacity={0.7}
        >
          <Text style={styles.resetButtonText}>Reset Statistics</Text>
        </TouchableOpacity>
      </ScrollView>
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
  content: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  overviewSection: {
    marginBottom: spacing.xl,
  },
  bigStatCard: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.lg,
    padding: spacing.xl,
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  bigStatValue: {
    fontSize: 48,
    fontFamily: fontFamily.display,
    color: colors.white,
  },
  bigStatLabel: {
    ...typography.label,
    color: colors.whiteAlpha70,
    marginTop: spacing.xs,
  },
  rowStats: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  smallStatCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  smallStatValue: {
    ...typography.heading,
    color: colors.accent,
  },
  smallStatLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  sectionTitle: {
    ...typography.headingUpper,
    color: colors.text,
    marginBottom: spacing.md,
    marginTop: spacing.md,
  },
  statRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
    gap: spacing.sm,
  },
  statRowLabel: {
    ...typography.label,
    color: colors.text,
    width: 130,
  },
  statBarContainer: {
    flex: 1,
    height: 8,
    backgroundColor: colors.border,
    borderRadius: borderRadius.sm,
    overflow: 'hidden',
  },
  statBar: {
    height: '100%',
    backgroundColor: colors.ink,
    borderRadius: borderRadius.sm,
  },
  statRowValue: {
    ...typography.captionBold,
    color: colors.textSecondary,
    width: 40,
    textAlign: 'right',
  },
  resetButton: {
    marginTop: spacing.xl,
    padding: spacing.md,
    alignItems: 'center',
  },
  resetButtonText: {
    ...typography.label,
    color: colors.error,
  },
});
