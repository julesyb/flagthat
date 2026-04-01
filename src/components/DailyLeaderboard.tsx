import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { spacing, typography, fontFamily, fontSize, borderRadius, ThemeColors } from '../utils/theme';
import { useTheme } from '../contexts/ThemeContext';
import { DailyLeaderboardEntry, sortLeaderboard } from '../utils/storage';
import { DAILY_QUESTION_COUNT } from '../utils/config';
import { t } from '../utils/i18n';
import { TrophyIcon } from './Icons';

interface Props {
  entries: DailyLeaderboardEntry[];
}

function formatTime(ms: number): string {
  const totalSeconds = ms / 1000;
  if (totalSeconds < 60) {
    return `${Math.round(totalSeconds * 10) / 10}s`;
  }
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = Math.round(totalSeconds % 60);
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

export default function DailyLeaderboard({ entries }: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const sorted = useMemo(() => sortLeaderboard(entries), [entries]);

  if (sorted.length === 0) return null;

  return (
    <View style={styles.container} accessibilityRole="list">
      <View style={styles.header}>
        <Text style={styles.title} accessibilityRole="header">{t('daily.leaderboard')}</Text>
        <Text style={styles.meta}>
          {sorted.length === 1
            ? t('daily.leaderboardCountSingle', { count: 1 })
            : t('daily.leaderboardCount', { count: sorted.length })}
        </Text>
      </View>
      {sorted.map((entry, index) => {
        const rank = index + 1;
        const isTopThree = rank <= 3;
        return (
          <View
            key={`${entry.name}-${entry.isMe ? 'me' : 'other'}`}
            style={[
              styles.row,
              entry.isMe && styles.rowMe,
            ]}
            accessibilityLabel={t('daily.leaderboardEntry', { rank, name: entry.name, score: entry.score, total: DAILY_QUESTION_COUNT, time: formatTime(entry.totalTimeMs) })}
          >
            <View style={[styles.rankBadge, isTopThree && styles.rankBadgeTop]}>
              {rank === 1 ? (
                <TrophyIcon size={14} color={colors.goldBright} />
              ) : (
                <Text style={[styles.rankText, isTopThree && styles.rankTextTop]}>
                  {rank}
                </Text>
              )}
            </View>
            <View style={styles.nameContainer}>
              <Text
                style={[styles.name, entry.isMe && styles.nameMe]}
                numberOfLines={1}
              >
                {entry.name}
                {entry.isMe ? ` (${t('challenge.you')})` : ''}
              </Text>
            </View>
            <View style={styles.statsContainer}>
              <Text style={styles.score}>
                {entry.score}/{DAILY_QUESTION_COUNT}
              </Text>
              <Text style={styles.time}>
                {formatTime(entry.totalTimeMs)}
              </Text>
            </View>
          </View>
        );
      })}
    </View>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  container: {
    marginBottom: spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  title: {
    ...typography.eyebrow,
    color: colors.textTertiary,
  },
  meta: {
    ...typography.micro,
    color: colors.textTertiary,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.sm,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.xs,
    gap: spacing.sm,
  },
  rowMe: {
    borderColor: colors.goldBright + '50',
    borderWidth: 2,
  },
  rankBadge: {
    width: 28,
    height: 28,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.surfaceSecondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rankBadgeTop: {
    backgroundColor: colors.goldAlpha15,
  },
  rankText: {
    fontFamily: fontFamily.display,
    fontSize: fontSize.sm,
    color: colors.textTertiary,
  },
  rankTextTop: {
    color: colors.goldBright,
  },
  nameContainer: {
    flex: 1,
  },
  name: {
    ...typography.bodyBold,
    color: colors.text,
  },
  nameMe: {
    color: colors.goldBright,
  },
  statsContainer: {
    alignItems: 'flex-end',
  },
  score: {
    ...typography.statValue,
    fontSize: fontSize.body,
    color: colors.text,
  },
  time: {
    ...typography.micro,
    color: colors.textTertiary,
  },
});
