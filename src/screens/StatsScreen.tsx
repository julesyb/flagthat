import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Alert,
  Platform,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { colors, spacing, typography, fontFamily, borderRadius } from '../utils/theme';
import { UserStats, GAME_MODES, GameMode } from '../types';
import { getStats, resetStats, getFlagStats, FlagStats } from '../utils/storage';
import { getAllFlags } from '../data';
import BottomNav from '../components/BottomNav';

export default function StatsScreen() {
  const navigation = useNavigation();
  const [stats, setStats] = useState<UserStats | null>(null);
  const [flagStats, setFlagStats] = useState<FlagStats>({});

  const flagNameMap = React.useMemo(() => {
    const map: Record<string, string> = {};
    for (const f of getAllFlags()) {
      map[f.id] = f.name;
    }
    return map;
  }, []);

  useFocusEffect(
    useCallback(() => {
      getStats().then(setStats);
      getFlagStats().then(setFlagStats);
    }, []),
  );

  const top10 = React.useMemo(() => {
    return Object.entries(flagStats)
      .filter(([, s]) => s.right > 0)
      .sort(([, a], [, b]) => b.right - a.right)
      .slice(0, 10);
  }, [flagStats]);

  const bottom10 = React.useMemo(() => {
    return Object.entries(flagStats)
      .filter(([, s]) => s.wrong > 0 && s.rightStreak < 3)
      .sort(([, a], [, b]) => b.wrong - a.wrong)
      .slice(0, 10);
  }, [flagStats]);

  const handleReset = async () => {
    if (Platform.OS === 'web') {
      const confirmed = window.confirm('Reset Statistics?\n\nAre you sure? This cannot be undone.');
      if (confirmed) {
        await resetStats();
        getStats().then(setStats);
      }
    } else {
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
    }
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
        style={{ flex: 1 }}
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
          {(stats.bestTimeAttackScore || 0) > 0 && (
            <View style={[styles.smallStatCard, { marginTop: spacing.sm }]}>
              <Text style={styles.smallStatValue}>{stats.bestTimeAttackScore}</Text>
              <Text style={styles.smallStatLabel}>Best Timed Quiz Score</Text>
            </View>
          )}
        </View>

        <Text style={styles.sectionTitle}>By Mode</Text>
        {(Object.keys(GAME_MODES) as GameMode[]).map((m) => {
          const s = stats.modeStats[m];
          const acc = s.total > 0 ? Math.round((s.correct / s.total) * 100) : 0;
          return (
            <View key={m} style={styles.modeStatCard}>
              <View style={styles.modeStatHeader}>
                <Text style={styles.modeStatLabel}>{GAME_MODES[m].label}</Text>
                <Text style={styles.modeStatPct}>
                  {s.total > 0 ? `${acc}%` : '-'}
                </Text>
              </View>
              <View style={styles.statBarContainer}>
                <View style={[styles.statBar, { width: `${acc}%` }]} />
              </View>
              <Text style={styles.modeStatDetail}>
                {s.total > 0
                  ? `${s.correct} correct out of ${s.total} answered`
                  : 'Not played yet'}
              </Text>
            </View>
          );
        })}

        {top10.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Top 10</Text>
            {top10.map(([id, s], i) => (
              <View key={id} style={styles.flagStatRow}>
                <Text style={styles.flagStatRank}>{i + 1}</Text>
                <Text style={styles.flagStatName}>{flagNameMap[id] || id}</Text>
                <Text style={[styles.flagStatCount, { color: colors.success }]}>
                  {s.right}x right
                </Text>
              </View>
            ))}
          </>
        )}

        {bottom10.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Bottom 10</Text>
            {bottom10.map(([id, s], i) => (
              <View key={id} style={styles.flagStatRow}>
                <Text style={styles.flagStatRank}>{i + 1}</Text>
                <Text style={styles.flagStatName}>{flagNameMap[id] || id}</Text>
                <Text style={[styles.flagStatCount, { color: colors.error }]}>
                  {s.wrong}x wrong
                </Text>
              </View>
            ))}
          </>
        )}

        <TouchableOpacity
          style={styles.resetButton}
          onPress={handleReset}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="Reset all statistics"
        >
          <Text style={styles.resetButtonText}>Reset Statistics</Text>
        </TouchableOpacity>
      </ScrollView>
      <BottomNav activeTab="Stats" onNavigate={(tab) => {
        if (tab === 'Play') navigation.navigate('Home' as never);
        else if (tab === 'Modes') navigation.navigate('GameSetup' as never);
        else if (tab === 'Browse') navigation.navigate('Browse' as never);
      }} />
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
    padding: spacing.xl,
    alignItems: 'center',
    marginBottom: spacing.sm,
    borderRadius: borderRadius.lg,
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
    padding: spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
  },
  smallStatValue: {
    ...typography.heading,
    color: colors.ink,
  },
  smallStatLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: spacing.xxs,
  },
  sectionTitle: {
    ...typography.headingUpper,
    color: colors.text,
    marginBottom: spacing.md,
    marginTop: spacing.md,
  },
  modeStatCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  modeStatHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  modeStatLabel: {
    ...typography.bodyBold,
    color: colors.text,
  },
  modeStatPct: {
    ...typography.bodyBold,
    color: colors.ink,
  },
  modeStatDetail: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  statBarContainer: {
    flex: 1,
    height: 8,
    backgroundColor: colors.border,
    overflow: 'hidden',
    borderRadius: borderRadius.full,
  },
  statBar: {
    height: '100%',
    backgroundColor: colors.ink,
    borderRadius: borderRadius.full,
  },
  flagStatRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    padding: spacing.md,
    marginBottom: spacing.xs,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    gap: spacing.md,
  },
  flagStatRank: {
    ...typography.captionBold,
    color: colors.textTertiary,
    width: 20,
    textAlign: 'center',
  },
  flagStatName: {
    ...typography.bodyBold,
    color: colors.text,
    flex: 1,
  },
  flagStatCount: {
    ...typography.captionBold,
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
